"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueTaskRunner = void 0;
const types_1 = require("../../types/types");
const BaseTaskRunner_1 = require("./BaseTaskRunner");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const QueueRunner_1 = require("../QueueRunner");
class QueueTaskRunner extends BaseTaskRunner_1.BaseTaskRunner {
    currentProcess = null;
    constructor() {
        super();
    }
    async handleScriptRun(task) {
        return new Promise((resolve, reject) => {
            try {
                const queuePort = process.env.PORT;
                const args = task.task_params.path.split(',');
                const scriptPath = args[0].trim();
                // Check if the script file exists
                const absolutePath = (0, path_1.resolve)(scriptPath);
                if (!(0, fs_1.existsSync)(absolutePath)) {
                    reject({
                        status: 'failed',
                        message: `Script file not found: ${scriptPath}`
                    });
                    return;
                }
                // Add queuePort as an argument
                args.push(`--port=${queuePort}`);
                const scriptType = (scriptPath.endsWith('.py') || scriptPath.indexOf('.py ') > -1) ? 'python' : 'node';
                this.currentProcess = (0, child_process_1.spawn)(scriptType, args, {
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
                        reject({ status: 'aborted', message: 'Task was aborted' });
                    }
                    else if (code !== 0) {
                        reject({
                            status: 'failed',
                            message: `Script exited with code ${code}`
                        });
                    }
                    else {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async start(task) {
        try {
            switch (task.action) {
                case types_1.QueueAction.Script:
                    await this.handleScriptRun(task);
                    break;
                case types_1.QueueAction.Pause:
                    QueueRunner_1.queueRunner.pause();
                    break;
                default:
                    throw new Error(`Unsupported queue action: ${task.action}`);
            }
            return true;
        }
        catch (error) {
            throw error;
        }
    }
    async stop() {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
        }
    }
    async abort() {
        await super.abort();
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.currentProcess = null;
        }
    }
}
exports.QueueTaskRunner = QueueTaskRunner;
