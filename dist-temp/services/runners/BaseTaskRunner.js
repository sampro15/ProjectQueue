"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTaskRunner = exports.AbortError = void 0;
const queries_1 = require("../../database/queries");
const dbHelpers_1 = require("../../database/dbHelpers");
const api_1 = require("../../Photomesh/api");
const SseManager_1 = require("../SseManager");
const axios_1 = require("axios");
class AbortError extends Error {
    constructor() {
        super("Task aborted");
        this.name = "AbortError";
    }
}
exports.AbortError = AbortError;
class BaseTaskRunner {
    project;
    task;
    status = {
        isRunning: false,
        progress: 0,
        currentStatus: "pending",
    };
    abortPromise = null;
    abortResolve = null;
    wasAborted = false;
    healthCheckTimeoutSeconds = 30;
    constructor() {
        this.status.isRunning = false;
        this.status.progress = 0;
        this.status.currentStatus = "pending";
        this.createAbortPromise();
    }
    createAbortPromise() {
        this.wasAborted = false;
        this.abortResolve = null; // Clear the old resolve reference
        this.abortPromise = new Promise((resolve) => {
            this.abortResolve = resolve;
        });
    }
    async abort() {
        this.status.isRunning = false;
        if (this.abortResolve) {
            this.wasAborted = true;
            this.abortResolve(false); // Resolve with false to indicate abort
        }
        throw new AbortError();
    }
    async updateTaskStatus(status) {
        if (!this.task?.id) {
            throw new Error("Cannot update status: Task ID is not set");
        }
        this.task.status = status;
        this.status.currentStatus = status;
        await (0, dbHelpers_1.withRetry)(queries_1.updateTaskStatus, [this.task.id, status]);
        SseManager_1.sseManager.sendTaskStatus(this.task); //send via sse the task status
    }
    async logMessage(message, status, logLevel = "info") {
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
                await (0, queries_1.insertTaskLog)(this.task.id, status, message, logLevel);
            }
            catch (error) {
                console.error("Failed to write log to database:", error);
            }
        }
    }
    async checkManagerHealth(startTime) {
        const managerResult = await api_1.healthApi.checkAlive();
        if (!managerResult.isAlive) {
            const endTime = new Date();
            if (this.task?.id) {
                await (0, dbHelpers_1.withRetry)(queries_1.updateTaskTimes, [this.task.id, startTime, endTime]);
                this.task.started_at = startTime;
                this.task.completed_at = endTime;
            }
            await this.logAndUpdateTaskStatus("Manager is not alive", "failed", "error");
            this.status.isRunning = false;
            return false;
        }
        return true;
    }
    async setEndTime(startTime) {
        const endTime = new Date(new Date().getTime() + 1000); // Adds 1 second
        if (this.task?.id) {
            await (0, dbHelpers_1.withRetry)(queries_1.updateTaskTimes, [this.task.id, startTime, endTime]);
            this.task.completed_at = endTime;
        }
    }
    async execute(task, project) {
        this.project = project;
        this.task = task;
        this.status.isRunning = true;
        this.createAbortPromise(); // Create new abort promise for this execution
        const startTime = new Date();
        let lastHealthyTime = new Date();
        let healthCheckInterval = null;
        try {
            if (this.task?.id) {
                await (0, dbHelpers_1.withRetry)(queries_1.updateTaskTimes, [this.task.id, startTime, null]);
                this.task.started_at = startTime;
            }
            if (!(await this.checkManagerHealth(startTime))) {
                return false;
            }
            await this.logAndUpdateTaskStatus(`Starting ${task.type} task: ${task.comment}`, "running", "info");
            // Create a promise that will reject if manager is down for more than 10 seconds
            const healthCheckPromise = new Promise((resolve, reject) => {
                healthCheckInterval = setInterval(async () => {
                    const managerResult = await api_1.healthApi.checkAlive();
                    if (managerResult.isAlive) {
                        lastHealthyTime = new Date();
                    }
                    else {
                        const downtime = new Date().getTime() - lastHealthyTime.getTime();
                        if (downtime > this.healthCheckTimeoutSeconds * 1000) {
                            reject(new Error(`Manager has been down for more than ${this.healthCheckTimeoutSeconds} seconds`));
                        }
                    }
                }, 2000); // Check every 2 seconds
            });
            // Race between task execution, abort signal, and health check
            const result = await Promise.race([
                this.start(task),
                this.abortPromise,
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
                await this.logAndUpdateTaskStatus("Task completed successfully", "completed", "info");
            }
            else {
                await this.logAndUpdateTaskStatus("Task failed", "failed", "error");
            }
            return result;
        }
        catch (error) {
            await this.setEndTime(startTime);
            this.status.isRunning = false;
            if (error && typeof error === "object" && "status" in error) {
                const statusError = error;
                if (error instanceof axios_1.AxiosError) {
                    const respMSG = error.response?.data?.ExceptionMessage;
                    SseManager_1.sseManager.sendMsg(respMSG);
                }
                await this.logAndUpdateTaskStatus(statusError.message, statusError.status, "error");
            }
            else {
                const isAbort = error instanceof Error && error.message === "Task aborted";
                const status = isAbort ? "aborted" : "failed";
                const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
                await this.logAndUpdateTaskStatus(`Task ${status}: ${errorMessage}`, status, isAbort ? "warning" : "error");
                if (isAbort) {
                    throw new AbortError();
                }
            }
            return false;
        }
        finally {
            // Clean up health check interval
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
            // Reset abort promise for next execution
            this.createAbortPromise();
        }
    }
    getStatus() {
        return this.status;
    }
    async logAndUpdateTaskStatus(message, status, logLevel = "info") {
        await this.logMessage(message, status, logLevel);
        await this.updateTaskStatus(status);
    }
}
exports.BaseTaskRunner = BaseTaskRunner;
