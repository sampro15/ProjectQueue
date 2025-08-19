import { Task, QueueAction, TaskStatus } from '../../types/types';
import { BaseTaskRunner } from './BaseTaskRunner';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { resolve as pathResolve } from 'path';
import { queueRunner } from '../QueueRunner';

export class QueueTaskRunner extends BaseTaskRunner {
    private currentProcess: ChildProcess | null = null;

    constructor() {
        super();
    }

    private async handleScriptRun(task: Task): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const queuePort = process.env.PORT;
                const args = task.task_params.path.split(',');
                const scriptPath = args[0].trim();

                // Check if the script file exists
                const absolutePath = pathResolve(scriptPath);
                if (!existsSync(absolutePath)) {
                    reject({
                        status: 'failed' as TaskStatus,
                        message: `Script file not found: ${scriptPath}`
                    });
                    return;
                }
                // Add queuePort as an argument
                args.push(`--port=${queuePort}`);

                const scriptType = (scriptPath.endsWith('.py') || scriptPath.indexOf('.py ') > -1) ? 'python' : 'node';

                this.currentProcess = spawn(scriptType, args, {
                    detached: false,
                    stdio: 'pipe',
                    windowsHide: true
                });

                this.currentProcess.stdout?.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                this.currentProcess.stderr?.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });

                this.currentProcess.on('exit', (code, signal) => {
                    if (signal === 'SIGTERM') {
                        reject({ status: 'aborted' as TaskStatus, message: 'Task was aborted' });
                    } else if (code !== 0) {
                        reject({
                            status: 'failed' as TaskStatus,
                            message: `Script exited with code ${code}`
                        });
                    } else {
                        setTimeout(resolve, 2000);
                    }
                });

                this.currentProcess.on('error', (err) => {
                    reject(err);
                });

                this.currentProcess.on('close', (code) => {
                    console.log(`Child process exited with code ${code}`);
                    this.currentProcess = null;
                });

                this.currentProcess.unref();
            } catch (error) {
                reject(error);
            }
        });
    }

    async start(task: Task): Promise<boolean> {
        try {
            switch (task.action) {
                case QueueAction.Script:
                    await this.handleScriptRun(task);
                    break;
                case QueueAction.Pause:
                     queueRunner.pause();
                    break;

                default:
                    throw new Error(`Unsupported queue action: ${task.action}`);
            }

            return true;
        } catch (error) {
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
        }
    }

    async abort(): Promise<void> {
        await super.abort();
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.currentProcess = null;
        }
    }
} 