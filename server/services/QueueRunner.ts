import { Task, QueueStatusType, Project, TaskStatus } from '../types/types';
import { TaskRunnerFactory } from './runners/TaskRunnerFactory';
import { getTaskByGuid, getNextPendingProject, updateProjectStatus, getTaskById, setGlobalVars, recoverInterruptedProject, getGlobalVars, abortAllProjects } from '../database/queries';
import { EventEmitter } from 'events';
import { withRetry } from '../database/dbHelpers';
import { sseManager } from './SseManager';
import {checkQueueIsEmpty} from "../database/queries";

// Default API endpoint for queue recovery state
let baseURL = `http://${process.env.PHOTOMESH_EXE_SERVER_URL}:${process.env.PHOTOMESH_EXE_SERVER_PORT}`;
const QUEUE_RECOVERY_API = `${baseURL}/Settings`;

export interface QueueStatus {
  current_project_id: number | null;
  current_task_id: number | null;
  project_key: string | null;
  progress: number;
  status: QueueStatusType;
}


export class QueueRunner extends EventEmitter {
  private static instance: QueueRunner;
  private status: QueueStatus;
  private previousStatus: QueueStatusType | null = null;
  private currentRunner?: ReturnType<typeof TaskRunnerFactory.createTaskRunner>;
  private isRunning: boolean = false;
  private processingLoop?: NodeJS.Timeout;

  private constructor() {
    super();
    this.status = {
      current_project_id: null,
      current_task_id: null,
      project_key: null,
      progress: 0,
      status: QueueStatusType.PENDING
    };
  }

  public static getInstance(): QueueRunner {
    if (!QueueRunner.instance) {
      QueueRunner.instance = new QueueRunner();
      QueueRunner.instance.start();
    }
    return QueueRunner.instance;
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.setQueueStatus(QueueStatusType.PENDING);

    try {
      // Check queue recovery state
      const QueueRecoveryEnabled = await this.checkQueueRecoveryState();
      
      if (QueueRecoveryEnabled) {
        await withRetry(recoverInterruptedProject, []);
      } else {
        await withRetry(abortAllProjects, []);
      }
    } catch (error) {
      console.error('Error in queue recovery process:', error);
    }

    this.processingLoop = setInterval(async () => {
      if ([QueueStatusType.RUNNING, QueueStatusType.PAUSED, QueueStatusType.ABORTING].includes(this.status.status)) return;

      try {
        const nextProject = await withRetry<Project>(getNextPendingProject, []);
        if (nextProject) {
          await this.processProject(nextProject);
        }
      } catch (error) {
        console.error('Error in queue processing loop:', error);
      }
    }, 5000);
  }

  private async checkQueueRecoveryState(): Promise<boolean> {
    try {
      const response = await fetch(QUEUE_RECOVERY_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as { QueueRecoveryEnabled?: boolean };
      console.log("the queue recovery state is: ",data.QueueRecoveryEnabled);
      return data.QueueRecoveryEnabled ?? false;
    } catch (error) {
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

    this.setQueueStatus(QueueStatusType.STOPPED);
  }

  getStatus(): QueueStatus {
    return this.status;
  }

  private async initializeProjectGlobals(project: Project): Promise<Record<string, any>> {
    const projectGlobals: Record<string, any> = {
      ...project.global_vars,
      '$$current_task_id': null,
      '$$project_tasks_dict': this.buildTasksDictionary(project.tasks)
    };

    project.global_vars = projectGlobals;

    await withRetry(setGlobalVars, [project.id!, projectGlobals]);
    return projectGlobals;
  }

  private buildTasksDictionary(tasks: Task[]): Record<string, string> {
    const tasksDict: Record<string, string> = {};
    for (const task of tasks) {
      if (task.id && task.guid) {
        tasksDict[task.id.toString()] = task.guid;
      }
    }
    return tasksDict;
  }

  public async updateProjectGlobals(projectId: number, propName: string, propValue: any): Promise<void> {
    const projectGlobalsString = await withRetry<any | undefined>(getGlobalVars, [projectId]);
    let projectGlobals;

    if (!projectGlobalsString) {
      projectGlobals = {};
    } else {
      projectGlobals = JSON.parse(projectGlobalsString);
    }

    projectGlobals[propName] = propValue;
    await withRetry(setGlobalVars, [projectId, projectGlobals]);
  }

  private async processProject(project: Project) {
    try {
      await updateProjectStatus(project.id!, 'running');
      this.setQueueStatus(QueueStatusType.RUNNING);
      this.status.current_project_id = project.id ?? null;
      this.status.project_key = project.project_key ?? null;

      await this.initializeProjectGlobals(project);
      const result = await this.executeProjectTasks(project);

      await this.finalizeProject(project, result.status);

    } catch (error) {
      console.error('Error processing project:', error);
      await updateProjectStatus(project.id!, 'failed');
      this.setQueueStatus(QueueStatusType.PENDING);
    }
  }

  private async executeProjectTasks(project: Project): Promise<{ status: TaskStatus }> {
    let currentTask = project.tasks.find(
      (t) => !t.status || t.status === "pending"
    );
    while (currentTask && this.isRunning) {


      if (this.status.status === QueueStatusType.ABORTING) {
        return { status: 'aborted' };
      }

      try {
        await this.handlePauseIfNeeded();

        this.status.current_task_id = currentTask.id;
        await this.updateProjectGlobals(project.id!, '$$current_task_id', currentTask.id);
          
        //fun - here find all the param that with $$ and replace with the global vars. / may use regex 
        const updatedTask = this.replaceTaskParamsVariables(project.global_vars, currentTask);


        const success = await this.executeTask(updatedTask, project);

        if (!success) {
          return { status: 'failed' };
        }

        const nextTask = await this.getNextTask(updatedTask, success);
        if (!nextTask) break;
        currentTask = nextTask;
      } catch (error) {
        if (error instanceof Error && error.message === 'Task aborted') {
          return { status: 'aborted' };
        }
        throw error; // Re-throw other errors
      }
    }

    return { status: 'completed' };
  }

  private replaceTaskParamsVariables(globalVars: Record<string, string>, task: Task): Task {
    const replaceInString = (value: string): string => {
      return value.replace(/\$\$(\w+)\$\$/g, (_, varName) => {
        return globalVars[varName] ?? `$$${varName}$$`;
      });
    };
  
    const replaceRecursive = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(replaceRecursive);
      } else if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
          newObj[key] = replaceRecursive(obj[key]);
        }
        return newObj;
      } else if (typeof obj === 'string') {
        return replaceInString(obj);
      } else {
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
  

  private async executeTask(task: Task, project: Project): Promise<boolean> {
    const runner = TaskRunnerFactory.createTaskRunner(task);
    this.currentRunner = runner;
    const success = await runner.execute(task, project);
    await new Promise(resolve => setTimeout(resolve, 2000));

    return success;
  }

  private async finalizeProject(
    project: Project,
    status: TaskStatus
  ): Promise<void> {
    await this.updateProjectGlobals(project.id!, '$$current_task_id', null);

    await updateProjectStatus(project.id!, status);

    // Send appropriate SSE event based on status
    switch (status) {
      case 'completed':
        sseManager.sendFinished(project);
        break;
      case 'aborted':
        sseManager.sendAborted(project);
        break;
    }
    //Send SSE event if Queue is Empty
    const pendingProjects  = await withRetry(checkQueueIsEmpty,[]); 
    if(pendingProjects  === 0){
      sseManager.sendQueueEmpty();
    }

    this.setQueueStatus(QueueStatusType.PENDING);
    this.status.current_project_id = null;
    this.status.current_task_id = null;
    this.status.project_key = null;
  }


  private async getNextTask(currentTask: Task, wasSuccessful: boolean): Promise<Task | undefined> {
    // First get the fresh task data from database
    const freshTask = await withRetry<Task>(getTaskById, [currentTask.id!]);
    if (!freshTask) return undefined;

    const nextTaskGuid = freshTask.next_task_guid;
    if (!nextTaskGuid) return undefined;

    return await withRetry(getTaskByGuid, [nextTaskGuid]);
  }

  pause() {
    this.setQueueStatus(QueueStatusType.PAUSED);
  }

  unpause() {
    // Restore the previous state, defaulting to PENDING if no previous state
    const stateToResume = this.previousStatus || QueueStatusType.PENDING;
    this.setQueueStatus(stateToResume, true);
    this.previousStatus = null;
  }

  private async handlePauseIfNeeded(): Promise<void> {
    if (this.status.status as QueueStatusType === QueueStatusType.PAUSED) {
      await new Promise<void>(resolve => {
        const checkPause = () => {
          if (this.status.status !== QueueStatusType.PAUSED) {
            resolve();
          } else {
            setTimeout(checkPause, 1000);
          }
        };
        checkPause();
      });
    }
  }

  private setQueueStatus(newStatus: QueueStatusType, force: boolean = false) {
    // Don't update to PENDING if we're PAUSED (unless forced)
    if (!force && newStatus === QueueStatusType.PENDING &&
      this.status.status === QueueStatusType.PAUSED) {
      // When trying to set PENDING while PAUSED, just update the previousStatus
      this.previousStatus = QueueStatusType.PENDING;
      return;
    }

    console.log(`Queue status changing from ${this.status.status} to ${newStatus}`);
    //we use the queue as automation so no need to sse the queue status it hapands on the task lvl.
    // Store previous state before pausing
    if (newStatus === QueueStatusType.PAUSED) {
      this.previousStatus = this.status.status;
      //if (this.status.current_project_id) 
        {
        //sseManager.sendPause({ id: this.status.current_project_id } as Project);
      }
    }
    else{
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
    if (oldStatus === QueueStatusType.PAUSED &&
      newStatus === QueueStatusType.RUNNING) {
      this.emit('unpaused');
    }
  }

  async abort() {
    try {
      this.setQueueStatus(QueueStatusType.ABORTING);

      if (this.currentRunner) {
        try {
          await this.currentRunner.abort();
        } catch (error) {
          // console.error('Error during abort:', error);
        }
      }

      if (this.status.current_project_id) {
        await this.finalizeProject({ id: this.status.current_project_id } as Project, 'aborted');
      }

    } finally {
      this.setQueueStatus(QueueStatusType.PENDING);
    }
  }
}

// Export the singleton instance
export const queueRunner = QueueRunner.getInstance();