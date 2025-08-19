import { Task, TaskStatus, Project } from '../../types/types';

export interface ITaskRunnerStatus {
  isRunning: boolean;
  progress: number;
  currentStatus: TaskStatus;
}

export interface ITaskRunner {
  execute(task: Task, project: Project): Promise<boolean>;
  start(task: Task): Promise<boolean>;
  stop(): Promise<void>;
  abort(): Promise<void>;
  getStatus(): ITaskRunnerStatus;
} 