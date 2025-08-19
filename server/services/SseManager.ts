import { Request, Response } from 'express';
import { EventEmitter } from 'events';
import { withRetry } from "../database/dbHelpers";
import { getEventReason} from '../database/queries';


import { Project, Queue, Task, TaskStatus ,HttpStatusDescriptions, TaskTypes} from '../types/types';

export class SseManager extends EventEmitter {
    private static instance: SseManager;
    private clients: Set<Response> = new Set();
    private currentProject: Project | null = null;

    private constructor() {
        super();
    }

    public static getInstance(): SseManager {
        if (!SseManager.instance) {
            SseManager.instance = new SseManager();
        }
        return SseManager.instance;
    }

    public getCurrentProject(): Project | null {
        return this.currentProject;
    }

    public setCurrentProject(project: Project): void {
        this.currentProject = project;
    }

    public addClient(req: Request, res: Response): void {
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

    private async sendEventToAll(eventName: string, data: any): Promise<void>  {
        let eventString;

        if (isTask(data) && data.status === 'failed') {
            const log_message = await withRetry(getEventReason, [data.id]);
            eventString = `event: ${eventName}\nreason: ${log_message}\ndata: ${JSON.stringify(data)}\n\n`;
        } else {
            eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        }

        this.clients.forEach(client => {
            try {
                client.write(eventString);
            } catch (error) {
                console.error('Error sending event to client:', error);
                this.clients.delete(client);
            }
        });
    }

    // Event methods matching the old main.js implementation
    public sendATCompleted(project: Project): void {
        this.sendEventToAll('ATCompleted', project);
    }

    public sendFinished(project: Project): void {
        this.sendEventToAll('Finished', project);
    }

    public sendAborted(project: Project): void {
        this.sendEventToAll('Aborted', project);
    }

    public sendQueueFinished(queue: Queue): void {
        this.sendEventToAll('QueueFinished', queue);
    }
    public sendQueueEmpty(): void {
        this.sendEventToAll('QueueFinished',"");
    }

    public sendBuildFailed(project: Project): void {
        this.sendEventToAll('BuildFailed', project);
    }

    public sendPause(project: Project): void {
        this.sendEventToAll('Pause', project);
    }
    //new events
    public sendUnPause(project: Project): void {
        this.sendEventToAll('UnPause', project);
    }
    public sendTaskStatus(task: Task): void {
        let statusDescription: string;
    
        // Check if task.status is a number and a known HTTP error code
        if (typeof task.status === "number" && HttpStatusDescriptions[task.status]) {
            statusDescription = "Fail - " + HttpStatusDescriptions[task.status];
        } else {
            statusDescription = task.status;
        }
    
        this.sendEventToAll(`Task ${task.comment} is ${statusDescription}`, task);
    }
    public sendMsg(msg: string): void {
        this.sendEventToAll(`PhotoMesh - ${msg}`, null);
    }
    public sendProjectAdded(queue : Queue){
        this.sendEventToAll('AddProjects', queue);
    }
    public sendTasksAdded(projectId:any,projectKey:any,tasks:any){
        this.sendEventToAll(`Added Tasks to Project - ${projectKey} , ID:${projectId}`, tasks);
    }
}
function isTask(data: any): data is Task {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.id === 'number' &&
        typeof data.project_id === 'number' &&
        typeof data.guid === 'string' &&
        typeof data.type === 'string' &&
        typeof data.action === 'number' &&
        typeof data.task_params === 'object' &&
        typeof data.is_active === 'boolean' &&
        'status' in data
    );
}
// Export singleton instance
export const sseManager = SseManager.getInstance(); 