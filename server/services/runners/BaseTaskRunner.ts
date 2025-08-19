import { Project, Task, TaskStatus, LogLevel } from "../../types/types";
import { ITaskRunner, ITaskRunnerStatus } from "./ITaskRunner";
import {
  updateTaskStatus,
  insertTaskLog,
  updateTaskTimes,
} from "../../database/queries";
import { withRetry } from "../../database/dbHelpers";
import { healthApi } from "../../Photomesh/api";
import { sseManager } from "../SseManager";
import { AxiosError } from "axios";
export class AbortError extends Error {
  constructor() {
    super("Task aborted");
    this.name = "AbortError";
  }
}

export abstract class BaseTaskRunner implements ITaskRunner {
  protected project: Project | undefined;
  protected task: Task | undefined;
  protected status: ITaskRunnerStatus = {
    isRunning: false,
    progress: 0,
    currentStatus: "pending",
  };

  private abortPromise: Promise<boolean> | null = null;
  private abortResolve: ((value: boolean) => void) | null = null;
  private wasAborted: boolean = false;
  private healthCheckTimeoutSeconds: number = 30;

  protected constructor() {
    this.status.isRunning = false;
    this.status.progress = 0;
    this.status.currentStatus = "pending";
    this.createAbortPromise();
  }

  private createAbortPromise() {
    this.wasAborted = false;
    this.abortResolve = null; // Clear the old resolve reference
    this.abortPromise = new Promise((resolve) => {
      this.abortResolve = resolve;
    });
  }

  abstract start(task: Task): Promise<boolean>;
  abstract stop(): Promise<void>;
  async abort(): Promise<void> {
    this.status.isRunning = false;
    if (this.abortResolve) {
      this.wasAborted = true;
      this.abortResolve(false); // Resolve with false to indicate abort
    }
    throw new AbortError();
  }

  protected async updateTaskStatus(status: TaskStatus): Promise<void> {
    if (!this.task?.id) {
      throw new Error("Cannot update status: Task ID is not set");
    }

    this.task.status = status;
    this.status.currentStatus = status;

    await withRetry(updateTaskStatus, [this.task!.id!, status]);
    sseManager.sendTaskStatus(this.task as Task); //send via sse the task status
  }

  protected async logMessage(
    message: string,
    status: TaskStatus,
    logLevel: LogLevel = "info"
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const taskId = this.task?.id || "unknown";

    switch (logLevel) {
      case "error":
        console.error(`[${timestamp}] Task ${taskId}: ${message}`);
        break;
      case "warning":
        console.warn(`[${timestamp}] Task ${taskId}: ${message}`);
        break;
      default:
        console.log(`[${timestamp}] Task ${taskId}: ${message}`);
    }

    // If the status is 'completed', introduce a delay
    if (status === "completed") {
      // Delay for 1 second before completing the log
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1000ms = 1 second
    }
    if (this.task?.id) {
      try {
        await insertTaskLog(this.task.id, status, message, logLevel);
      } catch (error) {
        console.error("Failed to write log to database:", error);
      }
    }
  }

  protected async checkManagerHealth(startTime: Date): Promise<boolean> {
    const managerResult = await healthApi.checkAlive();
    if (!managerResult.isAlive) {
      const endTime = new Date();
      if (this.task?.id) {
        await withRetry(updateTaskTimes, [this.task.id, startTime, endTime]);
        this.task.started_at = startTime;
        this.task.completed_at = endTime;
      }
      await this.logAndUpdateTaskStatus("Manager is not alive", "failed", "error");
      this.status.isRunning = false;
      return false;
    }
    return true;
  }

  async setEndTime(startTime: Date) {
    const endTime = new Date(new Date().getTime() + 1000); // Adds 1 second
    if (this.task?.id) {
      await withRetry(updateTaskTimes, [this.task.id, startTime, endTime]);
      this.task.completed_at = endTime;
    }
  }

  async execute(task: Task, project: Project): Promise<boolean> {
    this.project = project;
    this.task = task;
    this.status.isRunning = true;
    this.createAbortPromise(); // Create new abort promise for this execution
    const startTime = new Date();
    let lastHealthyTime = new Date();
    let healthCheckInterval: NodeJS.Timeout | null = null;

    try {
      if (this.task?.id) {
        await withRetry(updateTaskTimes, [this.task.id, startTime, null]);
        this.task.started_at = startTime;
      }

      if (!(await this.checkManagerHealth(startTime))) {
        return false;
      }

      await this.logAndUpdateTaskStatus(
        `Starting ${task.type} task: ${task.comment}`,
        "running",
        "info"
      );

      // Create a promise that will reject if manager is down for more than 10 seconds
      const healthCheckPromise = new Promise<boolean>((resolve, reject) => {
        healthCheckInterval = setInterval(async () => {
          const managerResult = await healthApi.checkAlive();
          if (managerResult.isAlive) {
            lastHealthyTime = new Date();
          } else {
            const downtime = new Date().getTime() - lastHealthyTime.getTime();
            if (downtime > this.healthCheckTimeoutSeconds * 1000) {
              reject(
                new Error(
                  `Manager has been down for more than ${this.healthCheckTimeoutSeconds} seconds`
                )
              );
            }
          }
        }, 2000); // Check every 2 seconds
      });

      // Race between task execution, abort signal, and health check
      const result = await Promise.race([
        this.start(task),
        this.abortPromise!,
        healthCheckPromise,
      ]);

      this.status.isRunning = false;
      this.status.progress = 100;

      await this.setEndTime(startTime);

      // If abort won the race
      if (result === false && this.wasAborted) {
        await this.logAndUpdateTaskStatus("Task aborted", "aborted", "warning");
        throw new AbortError();
      }

      if (result) {
        await this.logAndUpdateTaskStatus(
          "Task completed successfully",
          "completed",
          "info"
        );
      } else {
        await this.logAndUpdateTaskStatus("Task failed", "failed", "error");
      }

      return result;
    } catch (error) {
      await this.setEndTime(startTime);

      this.status.isRunning = false;

      if (error && typeof error === "object" && "status" in error) {
        const statusError = error as { status: TaskStatus; message: string };

        if (error instanceof AxiosError) {
          const respMSG = error.response?.data?.ExceptionMessage;
          sseManager.sendMsg(respMSG);
        }
        await this.logAndUpdateTaskStatus(statusError.message, statusError.status, "error");
      } else {
        const isAbort =
          error instanceof Error && error.message === "Task aborted";
        const status = isAbort ? "aborted" : "failed";
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        await this.logAndUpdateTaskStatus(
          `Task ${status}: ${errorMessage}`,
          status,
          isAbort ? "warning" : "error"
        );
        if (isAbort) {
          throw new AbortError();
        }
      }

      return false;
    } finally {
      // Clean up health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      // Reset abort promise for next execution
      this.createAbortPromise();
    }
  }

  getStatus(): ITaskRunnerStatus {
    return this.status;
  }

  async logAndUpdateTaskStatus(
    message: string,
    status: TaskStatus,
    logLevel: LogLevel = "info"
  ) {
    await this.logMessage(message, status, logLevel);
    await this.updateTaskStatus(status);
  }
}
