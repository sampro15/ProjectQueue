"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queueService_1 = require("../services/queueService");
const queries_1 = require("../database/queries");
const SseManager_1 = require("../services/SseManager");
const api_1 = require("../Photomesh/api");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /queue/getQueue:
 *   get:
 *     summary: Get the current queue of projects
 *     tags:
 *       - Queue Management
 *     description: Retrieves a list of projects in the queue with pagination support
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of items to return (default 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of items to skip (default 0)
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter items after this timestamp (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Queue retrieved successfully
 *       404:
 *         description: Queue not found
 *       500:
 *         description: Server error
 */
router.get("/getQueue", async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        // Validate and parse timestamp with better error handling
        let since = undefined;
        if (req.query.since) {
            const timestamp = new Date(req.query.since);
            if (isNaN(timestamp.getTime())) {
                res.status(400).json({
                    error: "Invalid timestamp format. Please use ISO 8601 format (e.g., 2025-01-02T11:25:00)"
                });
                return;
            }
            since = timestamp;
        }
        const queue = await (0, queueService_1.getQueue)(limit, offset, since);
        if (queue) {
            res.json(queue);
        }
        else {
            res.status(404).json({ error: "Queue not found" });
        }
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get queue" });
    }
});
/**
 * @swagger
 * /queue/addProjects:
 *   post:
 *     summary: Add a new project to the queue
 *     description: |
 *       Adds one or more projects with their associated tasks to the processing queue.
 *
 *       This endpoint supports complex workflows with multiple task types and actions.
 *       Each project can contain multiple tasks that execute sequentially, with support
 *       for conditional branching based on task success or failure.
 *
 *       ## PhotoMesh Task Actions
 *       - **-1**: Create an empty project file ([example](#example-tooltip-CreateEmptyProject))
 *       - **0**: Create a new project with default settings ([example](#example-tooltip-NewProjectFromFolder))
 *       - **1**: Create a new build version ([example](#example-tooltip-AddNewBuild))
 *       - **2**: Copy an existing build as a new version ([example](#example-tooltip-AddCopyBuild))
 *       - **3**: Execute a build process ([example](#example-tooltip-AddExecuteBuild))
 *       - **4**: Pause project processing ([example](#example-tooltip-AddPauseTask))
 *       - **6**: Process error tiles ([example](#example-tooltip-AddProcessErrorTiles))
 *       - **7**: Import data from a CSV file ([example](#example-tooltip-AddImportCSV))
 *       - **8**: Import ground control point data ([example](#example-tooltip-AddImportGCP))
 *       - **10**: Load ground control point data ([example](#example-tooltip-AddLoadGCP))
 *       - **11**: Load photo data from folder or file ([example](#example-tooltip-AddLoadPhotos))
 *       - **12**: Open an existing project ([example](#example-tooltip-AddOpenExistingProject))
 *
 *       ## Queue Task Actions
 *       - **0**: Run a specified script ([example](#example-tooltip-AddRunScript))
 *       - **4**: Pause project processing ([example](#example-tooltip-AddPauseTask2))
 *
 *     tags:
 *       - Queue Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projects
 *             properties:
 *               version:
 *                 type: string
 *                 description: API version for request format compatibility
 *                 example: "1.0"
 *               projects:
 *                 type: array
 *                 description: List of projects to add to the queue
 *                 items:
 *                   type: object
 *                   required:
 *                     - project_key
 *                     - tasks
 *                   properties:
 *                     project_key:
 *                       type: string
 *                       description: Unique identifier for the project within the queue
 *                       example: "proj-001"
 *                     project_name:
 *                       type: string
 *                       description: Human-readable name for the project
 *                       example: "Aerial Survey Project"
 *                     comment:
 *                       type: string
 *                       description: Additional description or notes about the project
 *                     global_vars:
 *                       type: object
 *                       description: Global variables available to all tasks in the project
 *                       additionalProperties: true
 *                       example:
 *                         basePath: "C:/Projects/AerialSurvey"
 *                         outputFormat: "3dml"
 *                     tasks:
 *                       type: array
 *                       description: Ordered list of tasks to execute for this project
 *                       items:
 *                         type: object
 *                         required:
 *                           - type
 *                           - action
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum:
 *                               - PhotoMesh
 *                               - Queue
 *                             description: Type of task to execute
 *                           comment:
 *                             type: string
 *                             description: Additional notes or description for the task
 *                           action:
 *                             type: integer
 *                             description: |
 *                               Action code that defines what operation to perform:
 *                               * **-1**: Create an empty project
 *                               * **0**: Create a new project with default settings
 *                               * **1**: Create a new build version
 *                               * **2**: Copy an existing build as a new version
 *                               * **3**: Execute a build process
 *                               * **4**: Pause project processing
 *                               * **5**: Run a specified script
 *                               * **6**: Process error tiles
 *                               * **7**: Import data from a CSV file
 *                               * **8**: Import ground control point data
 *                               * **9**: Import a trajectory file
 *                               * **10**: Load ground control point data
 *                               * **11**: Load photo data
 *                               * **12**: Open an existing project
 *                             minimum: -1
 *                             maximum: 12
 *                           task_params:
 *                             type: object
 *                             description: |
 *                               Parameters specific to the task action. See the
 *                               [task_params](#/components/schemas/task_params) schema for full documentation.
 *                             additionalProperties: true
 *     responses:
 *       '200':
 *         description: Project added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       '400':
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid project configuration"
 */
router.post("/addProjects", async (req, res) => {
    try {
        const queueData = req.body;
        const result = await (0, queueService_1.addQueue)(queueData);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to add to queue" });
    }
});
/**
 * @swagger
 * /queue/status:
 *   get:
 *     summary: Get queue status
 *     tags:
 *       - Queue Management
 *     description: Retrieves the current status of the processing queue
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *       404:
 *         description: Queue not found or not running
 *       500:
 *         description: Server error
 */
router.get("/status", async (req, res) => {
    try {
        const status = (0, queueService_1.getQueueStatus)();
        if (!status) {
            res.status(404).json({ error: 'Queue not found or not running' });
        }
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get queue status" });
    }
});
/**
 * @swagger
 * /queue/pause:
 *   post:
 *     summary: Pause the queue
 *     tags:
 *       - Queue Management
 *     description: Pauses the processing of projects in the queue
 *     responses:
 *       200:
 *         description: Queue paused successfully
 *       500:
 *         description: Failed to pause queue
 */
router.post("/pause", async (req, res) => {
    try {
        const result = (0, queueService_1.pauseQueue)();
        res.json({ success: result });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to pause queue"
        });
    }
});
/**
 * @swagger
 * /queue/unpause:
 *   post:
 *     summary: Unpause the queue
 *     tags:
 *       - Queue Management
 *     description: Resumes the processing of projects in the queue
 *     responses:
 *       200:
 *         description: Queue unpaused successfully
 *       500:
 *         description: Failed to unpause queue
 */
router.post("/unpause", async (req, res) => {
    try {
        const result = (0, queueService_1.unpauseQueue)();
        res.json({ success: result });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to unpause queue"
        });
    }
});
/**
 * @swagger
 * /queue/logs:
 *   get:
 *     summary: Get queue logs
 *     tags:
 *       - Queue Management
 *     description: Retrieves logs from the queue with filtering and pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of logs to return (default 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of logs to skip (default 0)
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, error]
 *         description: Filter logs by level
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs after this timestamp (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/logs", async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const logLevel = req.query.level;
        // Validate log level if provided
        if (logLevel && !['info', 'warning', 'error'].includes(logLevel)) {
            res.status(400).json({ error: "Invalid log level value" });
            return;
        }
        // Validate and parse timestamp with better error handling
        let since = undefined;
        if (req.query.since) {
            const timestamp = new Date(req.query.since);
            if (isNaN(timestamp.getTime())) {
                res.status(400).json({
                    error: "Invalid timestamp format. Please use ISO 8601 format (e.g., 2025-01-02T11:25:00)"
                });
                return;
            }
            since = timestamp;
        }
        const { logs, total } = await (0, queries_1.getLatestLogs)(limit, offset, logLevel, since);
        res.json({
            logs,
            pagination: {
                limit,
                offset,
                total
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch logs"
        });
    }
});
/**
 * @swagger
 * /queue/rerun:
 *   post:
 *     summary: Rerun a project
 *     tags:
 *       - Queue Management
 *     description: Restarts processing of a specific project in the queue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: integer
 *               taskId:
 *                 type: integer
 *             required:
 *               - projectId
 *     responses:
 *       200:
 *         description: Project rerun initiated successfully
 *       400:
 *         description: Invalid Project ID
 *       500:
 *         description: Failed to rerun project
 */
router.post("/rerun", async (req, res) => {
    try {
        const { projectId, taskId } = req.body;
        if (isNaN(projectId)) {
            res.status(400).json({ error: "Invalid Project ID" });
            return;
        }
        const result = await (0, queueService_1.rerunProject)(projectId, taskId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to rerun project"
        });
    }
});
/**
 * @swagger
 * /queue/abort:
 *   post:
 *     summary: Abort queue processing
 *     tags:
 *       - Queue Management
 *     description: Stops the processing of the running project in the queue
 *     responses:
 *       200:
 *         description: Queue aborted successfully
 *       500:
 *         description: Failed to abort queue
 */
router.post("/abort", async (req, res) => {
    try {
        const result = (0, queueService_1.abortQueue)();
        res.json({ success: result });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to abort queue" });
    }
});
/**
 * @swagger
 * /queue/removeAll:
 *   post:
 *     summary: Removes all projects from the queue
 *     tags:
 *       - Queue Management
 *     description: Removes all projects from the queue
 *     responses:
 *       200:
 *         description: All projects removed successfully
 *       500:
 *         description: Failed to remove projects
 */
router.post("/removeAll", async (req, res) => {
    try {
        const result = (0, queueService_1.removeAllProjects)();
        res.json({ success: result });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to remove all projects" });
    }
});
/**
 * @swagger
 * /queue/events:
 *   get:
 *     summary: Subscribes to server-sent events (SSE) for real-time updates.
 *     tags:
 *       - Queue Management
 *     description: Establishes a connection for receiving real-time server events
 *     responses:
 *       200:
 *         description: SSE connection established
 *       500:
 *         description: Server error
 */
router.get("/events", (req, res) => {
    try {
        SseManager_1.sseManager.addClient(req, res);
    }
    catch (error) {
        console.error('Error establishing SSE connection:', error);
        res.status(500).json({ error: "Failed to establish SSE connection" });
    }
});
/**
 * @swagger
 * /queue/log:
 *   post:
 *     summary: Create a single log entry
 *     tags:
 *       - Queue Management
 *     description: Creates a new log entry for a specific task with custom severity level
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - message
 *             properties:
 *               taskId:
 *                 type: integer
 *                 description: ID of the task to log for
 *               status:
 *                 type: string
 *                 enum: [pending, running, completed, failed, aborted]
 *                 description: Current status of the task
 *               message:
 *                 type: string
 *                 description: Log message content
 *               logLevel:
 *                 type: string
 *                 enum: [info, warning, error]
 *                 default: info
 *                 description: Severity level of the log
 *     responses:
 *       200:
 *         description: Log entry created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post("/log", async (req, res) => {
    try {
        const { taskId, status, message, logLevel = 'info' } = req.body;
        if (!taskId || !message) {
            res.status(400).json({ error: "taskId and message are required" });
            return;
        }
        // Validate log level
        if (logLevel && !['info', 'warning', 'error'].includes(logLevel)) {
            res.status(400).json({ error: "Invalid log level. Must be one of: info, warning, error" });
            return;
        }
        // Validate status if provided
        if (status && !['pending', 'running', 'completed', 'failed', 'aborted'].includes(status)) {
            res.status(400).json({ error: "Invalid status. Must be one of: pending, running, completed, failed, aborted" });
            return;
        }
        await (0, queries_1.insertTaskLog)(taskId, status, message, logLevel);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create log entry"
        });
    }
});
/**
 * Get the current PhotoMesh status
 */
router.get("/pmstatus", async (req, res) => {
    try {
        const status = await api_1.projectApi.getStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to get PhotoMesh status"
        });
    }
});
exports.default = router;
