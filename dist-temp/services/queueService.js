"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAllProjects = exports.abortQueue = exports.rerunProject = exports.unpauseQueue = exports.pauseQueue = exports.getQueue = exports.getQueueStatus = exports.addQueue = void 0;
const types_1 = require("../types/types");
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const dbHelpers_1 = require("../database/dbHelpers");
const queries_1 = require("../database/queries");
const QueueRunner_1 = require("./QueueRunner");
const globals_1 = require("../globals");
const SseManager_1 = require("./SseManager");
const OldBuildActions = {
    createNewProject: 0,
    newBuildVersion: 1,
    newBuildVersionCopyAT: 2,
    build: 3,
    pause: 4,
    script: 5,
    buildErrorTiles: 6
};
function replaceKeywords(str) {
    if (!str)
        return "";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let result = str;
    result = result.replace(/\$Date/g, dateStr);
    result = result.replace(/\$Hostname/g, os_1.default.hostname());
    result = result.replace(/\$Version/g, globals_1.managerState.version || '');
    return result;
}
function getInternalIP() {
    const networkInterfaces = os_1.default.networkInterfaces();
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
    return os_1.default.hostname(); // Fallback to hostname if no IPv4 found
}
function getManagerIP() {
    return getInternalIP();
}
const addQueue = async (queue) => {
    if (!queue.version) {
        const oldTasks = queue.projects;
        const newProject = {
            is_active: true,
            global_vars: {},
            manager: getManagerIP(),
            project_key: 'proj0',
            status: 'pending',
            tasks: oldTasks.map((oldTask) => {
                const { comment, action, ...taskParamsWithoutCommentAndAction } = oldTask;
                // Convert old run script action to a queue action
                // const type = action === PhotoMeshAction.Script ? 'Queue' : 'PhotoMesh';
                // const taskAction = action === PhotoMeshAction.Script ? QueueAction.Script : PhotoMeshAction.Script;
                const isScriptAction = action === OldBuildActions.script;
                return {
                    id: 0,
                    project_id: 0,
                    guid: (0, uuid_1.v4)(),
                    type: isScriptAction ? 'Queue' : 'PhotoMesh',
                    is_active: true,
                    comment: comment || '',
                    action: isScriptAction ? types_1.QueueAction.Script : action, // Keep original action if not script
                    task_params: taskParamsWithoutCommentAndAction,
                    status: 'pending',
                    created_at: new Date()
                };
            }),
        };
        const newQueue = {
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
            task.guid = task.guid || (0, uuid_1.v4)();
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
    SseManager_1.sseManager.sendProjectAdded(queue);
    await (0, dbHelpers_1.withRetry)(queries_1.insertToDatabase, [queue]);
};
exports.addQueue = addQueue;
const getQueueStatus = () => {
    return QueueRunner_1.queueRunner.getStatus();
};
exports.getQueueStatus = getQueueStatus;
const getQueue = async (limit, offset, since) => {
    const queue = await (0, dbHelpers_1.withRetry)(queries_1.getQueueQuery, [limit, offset, since]);
    if (queue) {
        const queueStatus = QueueRunner_1.queueRunner.getStatus();
        queue.status = queueStatus.status;
    }
    return queue;
};
exports.getQueue = getQueue;
const pauseQueue = () => {
    QueueRunner_1.queueRunner.pause();
    return true;
};
exports.pauseQueue = pauseQueue;
const unpauseQueue = () => {
    QueueRunner_1.queueRunner.unpause();
    return true;
};
exports.unpauseQueue = unpauseQueue;
const rerunProject = async (projectId, taskId) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }
    await (0, queries_1.rerunProjectByTaskId)(projectId, taskId);
    return { success: true };
};
exports.rerunProject = rerunProject;
const abortQueue = async () => {
    await QueueRunner_1.queueRunner.abort();
    return true;
};
exports.abortQueue = abortQueue;
const removeAllProjects = async () => {
    try {
        QueueRunner_1.queueRunner.pause();
        await (0, dbHelpers_1.withRetry)(queries_1.removeAllProjectsQuery, []);
        return true;
    }
    catch (error) {
        console.error('Error removing all projects:', error);
        throw error;
    }
    finally {
        QueueRunner_1.queueRunner.unpause();
    }
};
exports.removeAllProjects = removeAllProjects;
