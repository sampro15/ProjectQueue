import { PhotoMeshAction, Project, Queue, QueueAction, Task } from "../types/types";
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { withRetry } from "../database/dbHelpers";
import { getQueueQuery, insertToDatabase, rerunProjectByTaskId, removeAllProjectsQuery } from "../database/queries";
import { queueRunner } from './QueueRunner';
import { managerState } from "../globals";
import { sseManager } from "./SseManager";

type OldTaskFormat = {
    comment?: string;
    action: number;
};

const OldBuildActions = {
    createNewProject: 0,
    newBuildVersion: 1,
    newBuildVersionCopyAT: 2,
    build: 3,
    pause: 4,
    script: 5,
    buildErrorTiles: 6
}

function replaceKeywords(str: string | undefined | null): string {
    if (!str) return "";

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let result = str;
    result = result.replace(/\$Date/g, dateStr);
    result = result.replace(/\$Hostname/g, os.hostname());
    result = result.replace(/\$Version/g, managerState.version || '');
    return result;
    
}

function getInternalIP(): string {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
            for (const interface_ of interfaces) {
                // Skip over non-IPv4 and internal (e.g., 127.0.0.1) addresses
                if (interface_.family === 'IPv4' && !interface_.internal) {
                    return interface_.address;
                }
            }
        }
    }
    return os.hostname(); // Fallback to hostname if no IPv4 found
}

function getManagerIP(): string {
    return getInternalIP();
}

export const addQueue = async (queue: Queue) => {

    if (!queue.version) {
        const oldTasks = queue.projects as unknown as OldTaskFormat[];

        const newProject: Project = {
            is_active: true,
            global_vars: {},
            manager: getManagerIP(),
            project_key: 'proj0',
            status: 'pending',
            tasks: oldTasks.map((oldTask: OldTaskFormat): Task => {
                const { comment, action, ...taskParamsWithoutCommentAndAction } = oldTask;

                // Convert old run script action to a queue action
                // const type = action === PhotoMeshAction.Script ? 'Queue' : 'PhotoMesh';
                // const taskAction = action === PhotoMeshAction.Script ? QueueAction.Script : PhotoMeshAction.Script;
                const isScriptAction = action === OldBuildActions.script;

                return {
                    id: 0,
                    project_id: 0,
                    guid: uuidv4(),
                    type: isScriptAction ? 'Queue' : 'PhotoMesh',
                    is_active: true,
                    comment: comment || '',
                    action: isScriptAction ? QueueAction.Script : action, // Keep original action if not script
                    task_params: taskParamsWithoutCommentAndAction,
                    status: 'pending',
                    created_at: new Date()
                };
            }),
        };

        const newQueue: Queue = {
            projects: [newProject],
            version: '1.0'
        };

        queue = newQueue;
    }

    for (const project of queue.projects) {
        if (!project.manager) {
            project.manager = getManagerIP();
        }

        project.tasks.forEach(task => {
            task.guid = task.guid || uuidv4();
            if (task.comment) {
                task.comment = replaceKeywords(task.comment);
            }

            if (task.task_params) {
                Object.keys(task.task_params).forEach(key => {
                    const value = task.task_params[key];
                    if (typeof value === 'string') {
                        task.task_params[key] = replaceKeywords(value);
                    }
                });
            }
        });

        for (let i = 0; i < project.tasks.length; i++) {
            if (project.tasks[i].next_task_guid === undefined) {
                project.tasks[i].next_task_guid =
                    i < project.tasks.length - 1 ? project.tasks[i + 1].guid : undefined;
            }
        }
        
    }
    sseManager.sendProjectAdded(queue as Queue);
    await withRetry(insertToDatabase, [queue]);
}

export const getQueueStatus = () => {
    return queueRunner.getStatus();
}

export const getQueue = async (limit?: number, offset?: number, since?: Date) => {
    const queue = await withRetry<Queue>(getQueueQuery, [limit, offset, since]);
    if (queue) {
        const queueStatus = queueRunner.getStatus();
        queue.status = queueStatus.status;
    }
    return queue;
}

export const pauseQueue = () => {
    queueRunner.pause();
    return true;
}

export const unpauseQueue = () => {
    queueRunner.unpause();
    return true;
}

export const rerunProject = async (projectId: number , taskId: number | null) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }

    await rerunProjectByTaskId(projectId ,taskId);
    return { success: true };
}

export const abortQueue = async () => {
    await queueRunner.abort();
    return true;
}

export const removeAllProjects = async () => {
    try {
        queueRunner.pause();
        await withRetry(removeAllProjectsQuery, []);
        return true;
    } catch (error) {
        console.error('Error removing all projects:', error);
        throw error;
    } finally {
        queueRunner.unpause();
    }
}