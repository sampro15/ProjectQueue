"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalVarsQueue = exports.setGlobalVarsQueue = void 0;
exports.addProject = addProject;
exports.removeProject = removeProject;
exports.switchProjects = switchProjects;
exports.setNextTaskGuid = setNextTaskGuid;
exports.setNextTaskByName = setNextTaskByName;
exports.setNextTaskGuidForCurrentTask = setNextTaskGuidForCurrentTask;
exports.setNextTaskByNameForCurrentTask = setNextTaskByNameForCurrentTask;
exports.addTasksToProject = addTasksToProject;
const queries_1 = require("../database/queries");
const dbHelpers_1 = require("../database/dbHelpers");
const QueueRunner_1 = require("./QueueRunner");
async function addProject(project) {
    await (0, dbHelpers_1.withRetry)(queries_1.addProject, [project]);
}
async function removeProject(projectId) {
    await (0, dbHelpers_1.withRetry)(queries_1.removeProject, [projectId]);
}
async function switchProjects(projectId1, projectId2) {
    const queueStatus = QueueRunner_1.queueRunner.getStatus();
    const runningProjectId = queueStatus.current_project_id;
    const runningTaskId = queueStatus.current_task_id;
    let needToAbort = false;
    let abortError = null;
    try {
        // If either project is running, we need to abort it
        if (runningProjectId === projectId1 || runningProjectId === projectId2) {
            needToAbort = true;
            try {
                // First abort the currently running project
                await QueueRunner_1.queueRunner.abort();
                // Then stop queue to prevent new projects from starting
                QueueRunner_1.queueRunner.stop();
            }
            catch (error) {
                abortError = error;
                // Even if abort fails, we still want to try to reset statuses
                console.error('Error during abort:', error);
            }
            try {
                // Reset the running task's status to pending if it exists
                if (runningTaskId) {
                    await (0, dbHelpers_1.withRetry)(queries_1.updateTaskStatus, [runningTaskId, 'pending']);
                }
                // Reset the running project's status to pending
                await (0, dbHelpers_1.withRetry)(queries_1.updateProjectStatus, [runningProjectId, 'pending']);
            }
            catch (error) {
                console.error('Error resetting statuses:', error);
                throw error; // This is critical, so we should rethrow
            }
        }
        // Switch the projects' positions in the queue
        await (0, dbHelpers_1.withRetry)(queries_1.switchProjects, [projectId1, projectId2]);
        // If abort failed earlier, throw the error after the switch is complete
        if (abortError) {
            throw abortError;
        }
    }
    finally {
        if (needToAbort) {
            try {
                await QueueRunner_1.queueRunner.start();
            }
            catch (error) {
                console.error('Error restarting queue:', error);
                // Don't throw here as we don't want to mask the original error
            }
        }
    }
}
async function setNextTaskGuid(taskId, nextTaskGuid) {
    await (0, dbHelpers_1.withRetry)(queries_1.updateTaskNextGuid, [taskId, nextTaskGuid]);
}
async function setNextTaskByName(taskId, nextTaskName) {
    await (0, dbHelpers_1.withRetry)(queries_1.updateNextTaskByName, [taskId, nextTaskName]);
}
/**
 * Sets the next task GUID for the currently running task.
 * @throws Error if no task is currently running
 */
async function setNextTaskGuidForCurrentTask(nextTaskGuid) {
    const currentTaskId = QueueRunner_1.queueRunner.getStatus().current_task_id;
    if (!currentTaskId) {
        throw new Error('No task is currently running');
    }
    await setNextTaskGuid(currentTaskId, nextTaskGuid);
}
/**
 * Sets the next task by name for the currently running task.
 * @throws Error if no task is currently running
 */
async function setNextTaskByNameForCurrentTask(nextTaskName) {
    const currentTaskId = QueueRunner_1.queueRunner.getStatus().current_task_id;
    if (!currentTaskId) {
        throw new Error('No task is currently running');
    }
    await setNextTaskByName(currentTaskId, nextTaskName);
}
const setGlobalVarsQueue = async (projectId, globalVars) => {
    await (0, dbHelpers_1.withRetry)(queries_1.setGlobalVars, [projectId, globalVars]);
};
exports.setGlobalVarsQueue = setGlobalVarsQueue;
const getGlobalVarsQueue = async (projectId) => {
    return await (0, dbHelpers_1.withRetry)(queries_1.getGlobalVars, [projectId]);
};
exports.getGlobalVarsQueue = getGlobalVarsQueue;
async function addTasksToProject(projectId, projectKey, tasks) {
    return await (0, dbHelpers_1.withRetry)(queries_1.addTasksToProject, [projectId, projectKey, tasks]);
}
