import { Task } from '../../types/types';
import { PhotoMeshTaskRunner } from './PhotoMeshTaskRunner';
import { QueueTaskRunner } from './QueueTaskRunner';
import { BaseTaskRunner } from './BaseTaskRunner';

export class TaskRunnerFactory {
    private static runners: Map<string, BaseTaskRunner> = new Map();

    public static createTaskRunner(task: Task): BaseTaskRunner {
        // Get existing runner for this task type if it exists
        const existingRunner = this.runners.get(task.type);
        if (existingRunner) {
            return existingRunner;
        }

        // Create new runner if none exists for this task type
        let runner: BaseTaskRunner;
        switch (task.type) {
            case 'PhotoMesh':
                runner = new PhotoMeshTaskRunner();
                break;
            case 'Queue':
                runner = new QueueTaskRunner();
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }

        // Store the new runner
        this.runners.set(task.type, runner);
        return runner;
    }
} 