"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthApi = exports.referenceApi = exports.areaApi = exports.gcpApi = exports.photoApi = exports.buildApi = exports.projectApi = void 0;
const axios_1 = __importDefault(require("axios"));
const querystring_1 = require("querystring");
const eventsource_1 = require("eventsource");
const dotenv_1 = __importDefault(require("dotenv"));
const SseManager_1 = require("../services/SseManager");
dotenv_1.default.config();
function waitForEvent(eventSource, eventName) {
    return new Promise((resolve, reject) => {
        const handler = (event) => {
            eventSource.removeEventListener(eventName, handler);
            try {
                const result = JSON.parse(event.data);
                console.log(`${eventName} event data:`, result);
                // Special handling for BuildFinished event - don't check isSuccess
                if (eventName === "BuildFinished") {
                    resolve(result);
                    return;
                }
                // Handle other events with the C# API response format
                if (result.isSuccess) {
                    resolve({
                        isSuccess: result.isSuccess,
                        message: result.message,
                        data: result.data,
                    });
                }
                else {
                    reject(new Error(result.message || "Operation failed"));
                }
            }
            catch (error) {
                reject(error);
            }
        };
        eventSource.addEventListener(eventName, handler);
    });
}
let baseURL = `http://${process.env.PHOTOMESH_EXE_SERVER_URL}:${process.env.PHOTOMESH_EXE_SERVER_PORT}`;
// Event Source Management
class EventSourceSingleton {
    static instance;
    eventSource;
    constructor() {
        this.eventSource = new eventsource_1.EventSource(`${baseURL}/Events/All`);
        // Set up Progress event listener
        this.eventSource.addEventListener("Progress", ((event) => {
            try {
                const progressData = JSON.parse(event.data);
                // Check for AT completion based on Progress event
                if (progressData.stage === "MARKER_PROJECT_BUNDLE_MERGE" &&
                    progressData.status === 2) {
                    const project = SseManager_1.sseManager.getCurrentProject();
                    if (project) {
                        SseManager_1.sseManager.sendATCompleted(project);
                    }
                }
            }
            catch (error) {
                console.error("Error processing Progress event:", error);
            }
        }));
    }
    static getInstance() {
        if (!EventSourceSingleton.instance) {
            EventSourceSingleton.instance = new EventSourceSingleton();
        }
        return EventSourceSingleton.instance;
    }
    getEventSource() {
        return this.eventSource;
    }
}
// Initialize the singleton instance at startup
const eventSourceSingleton = EventSourceSingleton.getInstance();
exports.projectApi = {
    async getVersion() {
        const response = await axios_1.default.get(`${baseURL}/Project/GetVersion`);
        return response.data;
    },
    async save() {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.get(`${baseURL}/Project/Save/`);
            let res = await waitForEvent(eventSource, "SaveFinished");
            if (!res.isSuccess) {
                throw 'Could not save project';
            }
        }
        catch (error) {
            throw error;
        }
    },
    async close() {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.get(`${baseURL}/Project/CloseProject`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        catch (error) {
            throw error;
        }
    },
    async open(projectPath) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.get(`${baseURL}/Project/Open/${(0, querystring_1.escape)((0, querystring_1.escape)(projectPath))}`);
            const result = await waitForEvent(eventSource, "OpenFinished");
            return result;
        }
        catch (error) {
            throw error;
        }
    },
    async newProject(projectPath) {
        return await axios_1.default.get(`${baseURL}/Project/New/${(0, querystring_1.escape)((0, querystring_1.escape)(projectPath))}`);
    },
    async getBuildVersions() {
        const response = await axios_1.default.get(`${baseURL}/Project/BuildVersions`);
        return response.data;
    },
    async loadBuildVersion(buildName) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.get(`${baseURL}/Project/LoadBuildVersion/${(0, querystring_1.escape)((0, querystring_1.escape)(buildName))}?saveCurrentBuild=true&forceUpgrade=true`);
            await waitForEvent(eventSource, "OpenFinished");
        }
        catch (error) {
            throw error;
        }
    },
    async getATReport() {
        const response = await axios_1.default.get(`${baseURL}/Project/ATReport`);
        return response.data;
    },
    async getATDetailedReport() {
        const response = await axios_1.default.get(`${baseURL}/Project/ATDetailedReport`);
        return response.data;
    },
    async cancelBuild() {
        return axios_1.default.get(`${baseURL}/Project/CancelBuild/`);
    },
    async createNewBuildVersion(copyAT, name = "") {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            const url = `/Project/NewBuildVersion/${name}?CopyAT=${copyAT}`;
            await axios_1.default.get(baseURL + url);
            const result = await waitForEvent(eventSource, "NewBuildVersionFinished");
            return result;
        }
        catch (error) {
            throw error;
        }
    },
    async startBuild(params, projectId) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            const stages = [
                "Auto",
                "DataPreparation",
                "Aerotriangulation",
                "PointCloud",
                "ModelCreation",
                "Texturing",
                "Output",
            ];
            const buildSteps = `?BuildFrom=${stages[params.buildFrom]}&BuildUntil=${stages[params.buildUntil]}`;
            const workingFolder = params.workingFolder
                ? `&WorkingFolder=${encodeURIComponent(params.workingFolder)}`
                : "";
            const clearErrors = params.clearErrors
                ? `&ClearErrors=${params.clearErrors}`
                : "";
            const url = `/Project/Build/${encodeURIComponent(params.preset)}${buildSteps}${workingFolder}${clearErrors}`;
            const project = {
                id: projectId,
                project_key: projectId.toString(),
                manager: "",
                is_active: true,
                global_vars: {},
                status: "running",
                tasks: [],
            };
            // Store the current project in SSE manager for Progress events to access
            SseManager_1.sseManager.setCurrentProject(project);
            // First make the API call
            await axios_1.default.get(baseURL + url);
            const result = await waitForEvent(eventSource, "BuildFinished");
            const buildFinishedResult = result;
            // Handle build completion without AT specific logic
            if (buildFinishedResult.result === "Success" ||
                buildFinishedResult.result === "FinishedWithErrors") {
                // sseManager.sendFinished(project); // 
                return;
            }
            else if (buildFinishedResult.result === "Cancelled") {
                SseManager_1.sseManager.sendAborted(project);
                throw new Error("Build was cancelled");
            }
            else {
                SseManager_1.sseManager.sendBuildFailed(project);
                throw new Error(buildFinishedResult.message || "Build failed");
            }
        }
        catch (error) {
            throw error;
        }
    },
    async getStatus() {
        const response = await axios_1.default.get(`${baseURL}/Project/GetStatus`);
        return response.data;
    },
};
exports.buildApi = {
    async setMaxPoolFusers(count) {
        try {
            await axios_1.default.put(`${baseURL}/Build/MaxPoolFusers/${count}`);
        }
        catch (error) {
            console.error("Error setting max pool fusers:", error);
            throw error;
        }
    },
    async setMaxAWSFusers(count) {
        return axios_1.default.put(`${baseURL}/Build/MaxAWSFusers/${count}`);
    },
    async setAWSBuildConfigurationName(name) {
        return axios_1.default.get(`${baseURL}/Build/AWSBuildConfigurationName/${name}`);
    },
    async setAWSBuildConfigurationJsonPath(path) {
        return axios_1.default.get(`${baseURL}/Build/AWSBuildConfigurationJsonPath/${path}`);
    },
    async setAWSFuserStartupScript(script) {
        return axios_1.default.post(`${baseURL}/Build/AWSFuserStartupScript`, script, {
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
    async buildRerunErrorTiles(preset, buildSteps, workingFolder, clearErrors) {
        const folderParam = workingFolder
            ? `&WorkingFolder=${(0, querystring_1.escape)(workingFolder)}`
            : "";
        const errorsParam = clearErrors ? `&ClearErrors=${clearErrors}` : "";
        return axios_1.default.get(`${baseURL}/Project/BuildRerunErrorTiles/${(0, querystring_1.escape)(preset)}${buildSteps}${folderParam}${errorsParam}`);
    },
};
// Photo Management
exports.photoApi = {
    async loadPhotoFolders(photoFolders) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.post(`${baseURL}/Project/LoadPhotoFolders`, photoFolders, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const result = await waitForEvent(eventSource, "LoadPhotosFinished");
            if (!result.isSuccess) {
                throw new Error(result.message || "Failed to load photo folders");
            }
            return result;
        }
        catch (error) {
            throw error;
        }
    },
    async importPhotosFromVideo(videoPath, properties, focalLength35) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            const focalParam = focalLength35
                ? `&focalLength35=${focalLength35}`
                : "&focalLength35=24";
            await axios_1.default.get(`${baseURL}/Project/ImportPhotosFromVideo?videoFullPath=${(0, querystring_1.escape)(videoPath)}&properties=${(0, querystring_1.escape)(properties)}${focalParam}`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        catch (error) {
            throw error;
        }
    },
    async loadPhotosList(path) {
        const eventSource = eventSourceSingleton.getEventSource();
        try {
            await axios_1.default.get(`${baseURL}/Project/LoadPhotosList/${(0, querystring_1.escape)((0, querystring_1.escape)(path))}`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        catch (error) {
            throw error;
        }
    },
    async loadPhotosListCSV(path, jsonAPI) {
        return axios_1.default.post(`${baseURL}/Project/LoadPhotosListCSV/${(0, querystring_1.escape)((0, querystring_1.escape)(path))}`, jsonAPI, {
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
};
// GCP Management
exports.gcpApi = {
    async importGCP(gcpFileList) {
        return axios_1.default.get(`${baseURL}/Project/ImportGCP?gcpFileList=${(0, querystring_1.escape)(gcpFileList)}`);
    },
    async loadGCPList(path, jsonAPI) {
        return axios_1.default.post(`${baseURL}/Project/LoadGCPList/${(0, querystring_1.escape)((0, querystring_1.escape)(path))}`, jsonAPI, {
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
};
// Area Management
exports.areaApi = {
    async setATArea(wkt) {
        return axios_1.default.put(`${baseURL}/Project/ATArea/`, JSON.stringify(wkt), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
    async setReconstructionArea(wkt) {
        return axios_1.default.put(`${baseURL}/Project/ReconstructionArea/`, JSON.stringify(wkt), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
};
// Reference Project Management
exports.referenceApi = {
    async setReferenceProject(referenceProject) {
        return axios_1.default.get(`${baseURL}/Project/ReferenceProject?referenceProject=${referenceProject}`);
    },
};
// Add this new API object after the other API exports
exports.healthApi = {
    async checkAlive() {
        try {
            const response = await axios_1.default.get(`${baseURL}/Project/GetVersion`);
            const version = `${response.data._Major}.${response.data._Minor}.${response.data._Build}.${response.data._Revision}`;
            return {
                isAlive: true,
                version,
            };
        }
        catch (error) {
            return {
                isAlive: false,
                version: null,
            };
        }
    },
    startPeriodicCheck(intervalMs = 2000, onStatusChange) {
        let lastStatus = null;
        const check = async () => {
            const result = await this.checkAlive();
            // Only call the callback if the status actually changed
            if (onStatusChange && lastStatus !== result.isAlive) {
                onStatusChange(result);
            }
            lastStatus = result.isAlive;
            setTimeout(check, intervalMs);
        };
        // Start the periodic check
        check();
    },
};
