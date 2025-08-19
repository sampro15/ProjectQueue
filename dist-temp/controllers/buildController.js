"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_1 = require("../Photomesh/api");
const errorHandling_1 = require("../utils/errorHandling");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /build/start:
 *   get:
 *     summary: Start build process
 *     tags:
 *       - Build Management
 *     description: Initiates the build process for the current project
 *     responses:
 *       200:
 *         description: Build process started successfully
 *       500:
 *         description: Failed to start build process
 */
router.get('/start', async (req, res) => {
    try {
        // TODO: Add build start logic from main.js startBuild function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
/**
 * @swagger
 * /build/abort:
 *   get:
 *     summary: Abort build process
 *     tags:
 *       - Build Management
 *     description: Aborts the currently running build process
 *     responses:
 *       200:
 *         description: Build process aborted successfully
 *       500:
 *         description: Failed to abort build process
 */
router.get('/abort', async (req, res) => {
    try {
        await api_1.projectApi.cancelBuild();
        // TODO: Add abort logic from main.js abortProject function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
/**
 * @swagger
 * /build/getLog:
 *   get:
 *     summary: Get build logs
 *     tags:
 *       - Build Management
 *     description: Retrieves the logs from the current build process
 *     responses:
 *       200:
 *         description: Build logs retrieved successfully
 *       500:
 *         description: Failed to retrieve build logs
 */
router.get('/getLog', async (req, res) => {
    try {
        // TODO: Add get log logic from main.js getBuildLog function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
/**
 * @swagger
 * /build/clearLog:
 *   get:
 *     summary: Clear build logs
 *     tags:
 *       - Build Management
 *     description: Clears all logs from the current build process
 *     responses:
 *       200:
 *         description: Build logs cleared successfully
 *       500:
 *         description: Failed to clear build logs
 */
router.get('/clearLog', async (req, res) => {
    try {
        // TODO: Add clear log logic from main.js clearBuildLog function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
exports.default = router;
