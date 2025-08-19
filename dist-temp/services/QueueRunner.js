"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRunner = exports.QueueRunner = void 0;
const types_1 = require("../types/types");
const TaskRunnerFactory_1 = require("./runners/TaskRunnerFactory");
const queries_1 = require("../database/queries");
const events_1 = require("events");
const dbHelpers_1 = require("../database/dbHelpers");
const SseManager_1 = require("./SseManager");
const queries_2 = require("../database/queries");
// Default API endpoint for queue recovery state
let baseURL = `http://${process.env.PHOTOMESH_EXE_SERVER_URL}:${process.env.PHOTOMESH_EXE_SERVER_PORT}`;
const QUEUE_RECOVERY_API = `${baseURL}/Settings`;
class QueueRunner extends events_1.EventEmitter {
    static instance;
    status;
    previousStatus = null;
    currentRunner;
    isRunning = false;
    processingLoop;
    constructor() {
        super();
        this.status = {
            current_project_id: null,
            current_task_id: null,
            project_key: null,
            progress: 0,
            status: types_1.QueueStatusType.PENDING
        };
    }
    static getInstance() {
        if (!QueueRunner.instance) {
            QueueRunner.instance = new QueueRunner();
            QueueRunner.instance.start();
        }
        return QueueRunner.instance;
    }
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.setQueueStatus(types_1.QueueStatusType.PENDING);
        try {
            // Check queue recovery state
            const QueueRecoveryEnabled = await this.checkQueueRecoveryState();
            if (QueueRecoveryEnabled) {
                await (0, dbHelpers_1.withRetry)(queries_1.recoverInterruptedProject, []);
            }
            else {
                await (0, dbHelpers_1.withRetry)(queries_1.abortAllProjects, []);
            }
        }
        catch (error) {
            console.error('Error in queue recovery process:', error);
        }
        this.processingLoop = setInterval(async () => {
            if ([types_1.QueueStatusType.RUNNING, types_1.QueueStatusType.PAUSED, types_1.QueueStatusType.ABORTING].includes(this.status.status))
                return;
            try {
                const nextProject = await (0, dbHelpers_1.withRetry)(queries_1.getNextPendingProject, []);
                if (nextProject) {
                    await this.processProject(nextProject);
                }
            }
            catch (error) {
                console.error('Error in queue processing loop:', error);
            }
        }, 5000);
    }
    async checkQueueRecoveryState() {
        try {
            const response = await fetch(QUEUE_RECOVERY_API);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("the queue recovery state is: ", data.QueueRecoveryEnabled);
            return data.QueueRecoveryEnabled ?? false;
        }
        catch (error) {
            console.error('Error checking queue recovery state:', error);
            return false; // Default to false if there's an error
        }
    }
    async stop() {
        this.isRunning = false;
        if (this.processingLoop) {
            clearInterval(this.processingLoop);
        }
        if (this.currentRunner) {
            await this.currentRunner.stop();
        }
        this.setQueueStatus(types_1.QueueStatusType.STOPPED);
    }
    getStatus() {
        return this.status;
    }
    async initializeProjectGlobals(project) {
        const projectGlobals = {
            ...project.global_vars,
            '$$current_task_id': null,
            '$$project_tasks_dict': this.buildTasksDictionary(project.tasks)
        };
        project.global_vars = projectGlobals;
        await (0, dbHelpers_1.withRetry)(queries_1.setGlobalVars, [project.id, projectGlobals]);
        return projectGlobals;
    }
    buildTasksDictionary(tasks) {
        const tasksDict = {};
        for (const task of tasks) {
            if (task.id && task.guid) {
                tasksDict[task.id.toString()] = task.guid;
            }
        }
        return tasksDict;
    }
    async updateProjectGlobals(projectId, propName, propValue) {
        const projectGlobalsString = await (0, dbHelpers_1.withRetry)(queries_1.getGlobalVars, [projectId]);
        let projectGlobals;
        if (!projectGlobalsString) {
            projectGlobals = {};
        }
        else {
            projectGlobals = JSON.parse(projectGlobalsString);
        }
        projectGlobals[propName] = propValue;
        await (0, dbHelpers_1.withRetry)(queries_1.setGlobalVars, [projectId, projectGlobals]);
    }
    async processProject(project) {
        try {
            await (0, queries_1.updateProjectStatus)(project.id, 'running');
            this.setQueueStatus(types_1.QueueStatusType.RUNNING);
            this.status.current_project_id = project.id ?? null;
            this.status.project_key = project.project_key ?? null;
            await this.initializeProjectGlobals(project);
            const result = await this.executeProjectTasks(project);
            await this.finalizeProject(project, result.status);
        }
        catch (error) {
            console.error('Error processing project:', error);
            await (0, queries_1.updateProjectStatus)(project.id, 'failed');
            this.setQueueStatus(types_1.QueueStatusType.PENDING);
        }
    }
    async executeProjectTasks(project) {
        let currentTask = project.tasks.find((t) => !t.status || t.status === "pending");
        while (currentTask && this.isRunning) {
            if (this.status.status === types_1.QueueStatusType.ABORTING) {
                return { status: 'aborted' };
            }
            try {
                await this.handlePauseIfNeeded();
                this.status.current_task_id = currentTask.id;
                await this.updateProjectGlobals(project.id, '$$current_task_id', currentTask.id);
                //fun - here find all the param that with $$ and replace with the global vars. / may use regex 
                const updatedTask = this.replaceTaskParamsVariables(project.global_vars, currentTask);
                const success = await this.executeTask(updatedTask, project);
                if (!success) {
                    return { status: 'failed' };
                }
                const nextTask = await this.getNextTask(updatedTask, success);
                if (!nextTask)
                    break;
                currentTask = nextTask;
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Task aborted') {
                    return { status: 'aborted' };
                }
                throw error; // Re-throw other errors
            }
        }
        return { status: 'completed' };
    }
    replaceTaskParamsVariables(globalVars, task) {
        const replaceInString = (value) => {
            return value.replace(/\$\$(\w+)\$\$/g, (_, varName) => {
                return globalVars[varName] ?? `$$${varName}$$`;
            });
        };
        const replaceRecursive = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(replaceRecursive);
            }
            else if (typeof obj === 'object' && obj !== null) {
                const newObj = {};
                for (const key of Object.keys(obj)) {
                    newObj[key] = replaceRecursive(obj[key]);
                }
                return newObj;
            }
            else if (typeof obj === 'string') {
                return replaceInString(obj);
            }
            else {
                return obj;
            }
        };
        return {
            ...task,
            task_params: replaceRecursive(task.task_params),
        };
    }
    //delete this function if the uper one work  
    // private replaceTaskParamsVariables(globalVars: Record<string, string>, task: Task): Task {
    //   const replaceRecursive = (obj: any): any => {
    //     if (Array.isArray(obj)) {
    //       return obj.map(replaceRecursive);
    //     } else if (typeof obj === 'object' && obj !== null) {
    //       const newObj: any = {};
    //       for (const key of Object.keys(obj)) {
    //         newObj[key] = replaceRecursive(obj[key]);
    //       }
    //       return newObj;
    //     } else if (typeof obj === 'string' && obj.startsWith('$$')) {
    //       const varName = obj.slice(2);
    //       return globalVars[varName] ?? obj;
    //     } else {
    //       return obj;
    //     }
    //   };
    //   return {
    //     ...task,
    //     task_params: replaceRecursive(task.task_params),
    //   };
    // }
    async executeTask(task, project) {
        const runner = TaskRunnerFactory_1.TaskRunnerFactory.createTaskRunner(task);
        this.currentRunner = runner;
        const success = await runner.execute(task, project);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return success;
    }
    async finalizeProject(project, status) {
        await this.updateProjectGlobals(project.id, '$$current_task_id', null);
        await (0, queries_1.updateProjectStatus)(project.id, status);
        // Send appropriate SSE event based on status
        switch (status) {
            case 'completed':
                SseManager_1.sseManager.sendFinished(project);
                break;
            case 'aborted':
                SseManager_1.sseManager.sendAborted(project);
                break;
        }
        //Send SSE event if Queue is Empty
        const pendingProjects = await (0, dbHelpers_1.withRetry)(queries_2.checkQueueIsEmpty, []);
        if (pendingProjects === 0) {
            SseManager_1.sseManager.sendQueueEmpty();
        }
        this.setQueueStatus(types_1.QueueStatusType.PENDING);
        this.status.current_project_id = null;
        this.status.current_task_id = null;
        this.status.project_key = null;
    }
    async getNextTask(currentTask, wasSuccessful) {
        // First get the fresh task data from database
        const freshTask = await (0, dbHelpers_1.withRetry)(queries_1.getTaskById, [currentTask.id]);
        if (!freshTask)
            return undefined;
        const nextTaskGuid = freshTask.next_task_guid;
        if (!nextTaskGuid)
            return undefined;
        return await (0, dbHelpers_1.withRetry)(queries_1.getTaskByGuid, [nextTaskGuid]);
    }
    pause() {
        this.setQueueStatus(types_1.QueueStatusType.PAUSED);
    }
    unpause() {
        // Restore the previous state, defaulting to PENDING if no previous state
        const stateToResume = this.previousStatus || types_1.QueueStatusType.PENDING;
        this.setQueueStatus(stateToResume, true);
        this.previousStatus = null;
    }
    async handlePauseIfNeeded() {
        if (this.status.status === types_1.QueueStatusType.PAUSED) {
            await new Promise(resolve => {
                const checkPause = () => {
                    if (this.status.status !== types_1.QueueStatusType.PAUSED) {
                        resolve();
                    }
                    else {
                        setTimeout(checkPause, 1000);
                    }
                };
                checkPause();
            });
        }
    }
    setQueueStatus(newStatus, force = false) {
        // Don't update to PENDING if we're PAUSED (unless forced)
        if (!force && newStatus === types_1.QueueStatusType.PENDING &&
            this.status.status === types_1.QueueStatusType.PAUSED) {
            // When trying to set PENDING while PAUSED, just update the previousStatus
            this.previousStatus = types_1.QueueStatusType.PENDING;
            return;
        }
        console.log(`Queue status changing from ${this.status.status} to ${newStatus}`);
        //we use the queue as automation so no need to sse the queue status it hapands on the task lvl.
        // Store previous state before pausing
        if (newStatus === types_1.QueueStatusType.PAUSED) {
            this.previousStatus = this.status.status;
            //if (this.status.current_project_id) 
            {
                //sseManager.sendPause({ id: this.status.current_project_id } as Project);
            }
        }
        else {
            //if (this.status.current_project_id) 
            {
                //sseManager.sendUnPause({ id: this.status.current_project_id } as Project);
            }
        }
        const oldStatus = this.status.status;
        this.status.status = newStatus;
        // Emit the new status as event
        this.emit(newStatus.toLowerCase());
        // Special case for unpaused event
        if (oldStatus === types_1.QueueStatusType.PAUSED &&
            newStatus === types_1.QueueStatusType.RUNNING) {
            this.emit('unpaused');
        }
    }
    async abort() {
        try {
            this.setQueueStatus(types_1.QueueStatusType.ABORTING);
            if (this.currentRunner) {
                try {
                    await this.currentRunner.abort();
                }
                catch (error) {
                    // console.error('Error during abort:', error);
                }
            }
            if (this.status.current_project_id) {
                await this.finalizeProject({ id: this.status.current_project_id }, 'aborted');
            }
        }
        finally {
            this.setQueueStatus(types_1.QueueStatusType.PENDING);
        }
    }
}
exports.QueueRunner = QueueRunner;
// Export the singleton instance
exports.queueRunner = QueueRunner.getInstance();
