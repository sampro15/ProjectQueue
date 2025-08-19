"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandling_1 = require("../utils/errorHandling");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /manager/getURL:
 *   get:
 *     summary: Get manager URL
 *     tags:
 *       - PhotoMesh Queue Manager
 *     description: Retrieves the URL for the PhotoMesh manager interface
 *     responses:
 *       200:
 *         description: Manager URL retrieved successfully
 *       500:
 *         description: Failed to get manager URL
 */
router.get('/getURL', (req, res) => {
    try {
        // TODO: Add get URL logic from main.js getManagerURL function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
/**
 * @swagger
 * /manager/isAlive:
 *   get:
 *     summary: Check manager status
 *     tags:
 *       - PhotoMesh Queue Manager
 *     description: Checks if the PhotoMesh Queue Manager service is alive and responding (health check)
 *     responses:
 *       200:
 *         description: Manager status check completed
 *       500:
 *         description: Failed to check manager status
 */
router.get('/isAlive', async (req, res) => {
    try {
        // TODO: Add is alive logic from main.js isManagerAlive function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
/**
 * @swagger
 * /manager/getStatus:
 *   get:
 *     summary: Get manager status
 *     tags:
 *       - PhotoMesh Queue Manager
 *     description: Retrieves information about the current status of the PhotoMesh queue manager
 *     responses:
 *       200:
 *         description: Manager status retrieved successfully
 *       500:
 *         description: Failed to get manager status
 */
router.get('/getStatus', async (req, res) => {
    try {
        // TODO: Add get status logic from main.js getManagerStatus function
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: (0, errorHandling_1.getErrorMessage)(error) });
    }
});
exports.default = router;
