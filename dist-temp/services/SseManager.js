"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseManager = exports.SseManager = void 0;
const events_1 = require("events");
const dbHelpers_1 = require("../database/dbHelpers");
const queries_1 = require("../database/queries");
const types_1 = require("../types/types");
class SseManager extends events_1.EventEmitter {
    static instance;
    clients = new Set();
    currentProject = null;
    constructor() {
        super();
    }
    static getInstance() {
        if (!SseManager.instance) {
            SseManager.instance = new SseManager();
        }
        return SseManager.instance;
    }
    getCurrentProject() {
        return this.currentProject;
    }
    setCurrentProject(project) {
        this.currentProject = project;
    }
    addClient(req, res) {
        // Set headers for SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        // Add client to the set
        this.clients.add(res);
        // Handle client disconnect
        req.on('close', () => {
            this.clients.delete(res);
        });
    }
    async sendEventToAll(eventName, data) {
        let eventString;
        if (isTask(data) && data.status === 'failed') {
            const log_message = await (0, dbHelpers_1.withRetry)(queries_1.getEventReason, [data.id]);
            eventString = `event: ${eventName}\nreason: ${log_message}\ndata: ${JSON.stringify(data)}\n\n`;
        }
        else {
            eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        }
        this.clients.forEach(client => {
            try {
                client.write(eventString);
            }
            catch (error) {
                console.error('Error sending event to client:', error);
                this.clients.delete(client);
            }
        });
    }
    // Event methods matching the old main.js implementation
    sendATCompleted(project) {
        this.sendEventToAll('ATCompleted', project);
    }
    sendFinished(project) {
        this.sendEventToAll('Finished', project);
    }
    sendAborted(project) {
        this.sendEventToAll('Aborted', project);
    }
    sendQueueFinished(queue) {
        this.sendEventToAll('QueueFinished', queue);
    }
    sendQueueEmpty() {
        this.sendEventToAll('QueueFinished', "");
    }
    sendBuildFailed(project) {
        this.sendEventToAll('BuildFailed', project);
    }
    sendPause(project) {
        this.sendEventToAll('Pause', project);
    }
    //new events
    sendUnPause(project) {
        this.sendEventToAll('UnPause', project);
    }
    sendTaskStatus(task) {
        let statusDescription;
        // Check if task.status is a number and a known HTTP error code
        if (typeof task.status === "number" && types_1.HttpStatusDescriptions[task.status]) {
            statusDescription = "Fail - " + types_1.HttpStatusDescriptions[task.status];
        }
        else {
            statusDescription = task.status;
        }
        this.sendEventToAll(`Task ${task.comment} is ${statusDescription}`, task);
    }
    sendMsg(msg) {
        this.sendEventToAll(`PhotoMesh - ${msg}`, null);
    }
    sendProjectAdded(queue) {
        this.sendEventToAll('AddProjects', queue);
    }
    sendTasksAdded(projectId, projectKey, tasks) {
        this.sendEventToAll(`Added Tasks to Project - ${projectKey} , ID:${projectId}`, tasks);
    }
}
exports.SseManager = SseManager;
function isTask(data) {
    return (typeof data === 'object' &&
        data !== null &&
        typeof data.id === 'number' &&
        typeof data.project_id === 'number' &&
        typeof data.guid === 'string' &&
        typeof data.type === 'string' &&
        typeof data.action === 'number' &&
        typeof data.task_params === 'object' &&
        typeof data.is_active === 'boolean' &&
        'status' in data);
}
// Export singleton instance
exports.sseManager = SseManager.getInstance();
