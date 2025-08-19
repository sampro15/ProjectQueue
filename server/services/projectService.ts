import { Project, Task } from "../types/types";
import { addProject as addProjectQuery, getGlobalVars, removeProject as removeProjectQuery, setGlobalVars, switchProjects as switchProjectsQuery, updateTaskNextGuid, updateTaskStatus, updateProjectStatus, updateNextTaskByName, addTasksToProject as addTasksToProjectQuery } from "../database/queries";
import { withRetry } from "../database/dbHelpers";
import { queueRunner } from "./QueueRunner";

export async function addProject(project: Project) {
    await withRetry(addProjectQuery, [project]);
}

export async function removeProject(projectId: number) {
    await withRetry(removeProjectQuery, [projectId]);
}

export async function switchProjects(projectId1: number, projectId2: number) {
    const queueStatus = queueRunner.getStatus();
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
                await queueRunner.abort();
                // Then stop queue to prevent new projects from starting
                queueRunner.stop();
            } catch (error) {
                abortError = error;
                // Even if abort fails, we still want to try to reset statuses
                console.error('Error during abort:', error);
            }

            try {
                // Reset the running task's status to pending if it exists
                if (runningTaskId) {
                    await withRetry(updateTaskStatus, [runningTaskId, 'pending']);
                }

                // Reset the running project's status to pending
                await withRetry(updateProjectStatus, [runningProjectId, 'pending']);
            } catch (error) {
                console.error('Error resetting statuses:', error);
                throw error; // This is critical, so we should rethrow
            }
        }

        // Switch the projects' positions in the queue
        await withRetry(switchProjectsQuery, [projectId1, projectId2]);
        
        // If abort failed earlier, throw the error after the switch is complete
        if (abortError) {
            throw abortError;
        }
    } finally {
        if (needToAbort) {
            try {
                await queueRunner.start();
            } catch (error) {
                console.error('Error restarting queue:', error);
                // Don't throw here as we don't want to mask the original error
            }
        }
    }
}

export async function setNextTaskGuid(taskId: number, nextTaskGuid: string) {
    await withRetry(updateTaskNextGuid, [taskId, nextTaskGuid]);
}

export async function setNextTaskByName(taskId: number, nextTaskName: string) {
    await withRetry(updateNextTaskByName, [taskId, nextTaskName]);
}

/**
 * Sets the next task GUID for the currently running task.
 * @throws Error if no task is currently running
 */
export async function setNextTaskGuidForCurrentTask(nextTaskGuid: string) {
    const currentTaskId = queueRunner.getStatus().current_task_id;
    if (!currentTaskId) {
        throw new Error('No task is currently running');
    }
    await setNextTaskGuid(currentTaskId, nextTaskGuid);
}

/**
 * Sets the next task by name for the currently running task.
 * @throws Error if no task is currently running
 */
export async function setNextTaskByNameForCurrentTask(nextTaskName: string) {
    const currentTaskId = queueRunner.getStatus().current_task_id;
    if (!currentTaskId) {
        throw new Error('No task is currently running');
    }
    await setNextTaskByName(currentTaskId, nextTaskName);
}

export const setGlobalVarsQueue = async (projectId: number, globalVars: any) => {
    await withRetry(setGlobalVars, [projectId, globalVars])
}

export const getGlobalVarsQueue = async (projectId?: number) => {
    return await withRetry(getGlobalVars, [projectId])
}

export async function addTasksToProject(projectId: number | undefined, projectKey: string | undefined, tasks: Task[]): Promise<Task[]> {
   
    return await withRetry(addTasksToProjectQuery, [projectId, projectKey, tasks]);
}