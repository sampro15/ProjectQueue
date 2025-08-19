"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRunnerFactory = void 0;
const PhotoMeshTaskRunner_1 = require("./PhotoMeshTaskRunner");
const QueueTaskRunner_1 = require("./QueueTaskRunner");
class TaskRunnerFactory {
    static runners = new Map();
    static createTaskRunner(task) {
        // Get existing runner for this task type if it exists
        const existingRunner = this.runners.get(task.type);
        if (existingRunner) {
            return existingRunner;
        }
        // Create new runner if none exists for this task type
        let runner;
        switch (task.type) {
            case 'PhotoMesh':
                runner = new PhotoMeshTaskRunner_1.PhotoMeshTaskRunner();
                break;
            case 'Queue':
                runner = new QueueTaskRunner_1.QueueTaskRunner();
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
        // Store the new runner
        this.runners.set(task.type, runner);
        return runner;
    }
}
exports.TaskRunnerFactory = TaskRunnerFactory;
