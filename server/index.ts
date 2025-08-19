import projectController from "./controllers/projectController";
import buildController from "./controllers/buildController";
import managerController from "./controllers/managerController";
import queueController from "./controllers/queueController";

import express, { Application, Router } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";
import { healthApi } from "./Photomesh/api";
import { managerState } from "./globals";

const isMainProject = process.env.PM_RUN_UNDER_MAIN_PROJECT === "true";
if (!isMainProject) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

const app = !isMainProject ? express() : express.Router();

async function initialize() {
  try {
    // Check manager health first
    const healthCheck = await healthApi.checkAlive();
    managerState.isAlive = healthCheck.isAlive;
    managerState.version = healthCheck.version;

    // Start periodic health checks
    healthApi.startPeriodicCheck(2000, (status) => {
      managerState.isAlive = status.isAlive;
      managerState.version = status.version;
    });

    app.use(cors());
    app.use(express.json());

    app.use("/api/project", projectController);
    app.use("/api/build", buildController);
    app.use("/api/manager", managerController);
    app.use("/api/queue", queueController);

    if (!isMainProject) {
      (app as Application).listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
        console.log(
          `Swagger documentation available at http://localhost:${process.env.PORT}/api-docs`
        );
      });
    }
  } catch (error) {
    console.error("Error initializing server:", error);
    managerState.isAlive = false;
    managerState.version = null;
  }
}

if (!isMainProject) {
  initialize();
}

export { app, initialize };
