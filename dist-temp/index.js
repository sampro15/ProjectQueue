"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.initialize = initialize;
const projectController_1 = __importDefault(require("./controllers/projectController"));
const buildController_1 = __importDefault(require("./controllers/buildController"));
const managerController_1 = __importDefault(require("./controllers/managerController"));
const queueController_1 = __importDefault(require("./controllers/queueController"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const api_1 = require("./Photomesh/api");
const globals_1 = require("./globals");
const isMainProject = process.env.PM_RUN_UNDER_MAIN_PROJECT === "true";
if (!isMainProject) {
    dotenv.config({ path: path_1.default.resolve(__dirname, "../.env") });
}
const app = !isMainProject ? (0, express_1.default)() : express_1.default.Router();
exports.app = app;
async function initialize() {
    try {
        // Check manager health first
        const healthCheck = await api_1.healthApi.checkAlive();
        globals_1.managerState.isAlive = healthCheck.isAlive;
        globals_1.managerState.version = healthCheck.version;
        // Start periodic health checks
        api_1.healthApi.startPeriodicCheck(2000, (status) => {
            globals_1.managerState.isAlive = status.isAlive;
            globals_1.managerState.version = status.version;
        });
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.use("/api/project", projectController_1.default);
        app.use("/api/build", buildController_1.default);
        app.use("/api/manager", managerController_1.default);
        app.use("/api/queue", queueController_1.default);
        if (!isMainProject) {
            app.listen(process.env.PORT, () => {
                console.log(`Server running on port ${process.env.PORT}`);
                console.log(`Swagger documentation available at http://localhost:${process.env.PORT}/api-docs`);
            });
        }
    }
    catch (error) {
        console.error("Error initializing server:", error);
        globals_1.managerState.isAlive = false;
        globals_1.managerState.version = null;
    }
}
if (!isMainProject) {
    initialize();
}
