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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoMeshTaskRunner = void 0;
const types_1 = require("../../types/types");
const BaseTaskRunner_1 = require("./BaseTaskRunner");
const PhotoMeshApi = __importStar(require("../../Photomesh/api"));
const api_1 = require("../../Photomesh/api");
const QueueRunner_1 = require("../QueueRunner");
const dbHelpers_1 = require("../../database/dbHelpers");
const queries_1 = require("../../database/queries");
class PhotoMeshTaskRunner extends BaseTaskRunner_1.BaseTaskRunner {
    photomeshApi;
    PHOTO_LOAD_DELAY = 5000;
    currentTask = null;
    constructor() {
        super();
        this.photomeshApi = PhotoMeshApi;
    }
    async handlePhotoLoading(sourceData) {
        switch (sourceData.sourceType) {
            case types_1.SourceType.Folder:
                await this.loadPhotosFromFolder(sourceData.sourcePath);
                break;
            case types_1.SourceType.Video:
                await this.loadPhotosFromVideo(sourceData.sourcePath[0]);
                break;
            case types_1.SourceType.Excel:
                await this.loadPhotosFromExcel(sourceData.sourcePath[0].path);
                break;
            default:
                throw new Error(`Unsupported source type: ${sourceData.sourceType}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.PHOTO_LOAD_DELAY));
    }
    async loadPhotosFromFolder(sourcePaths) {
        const photoFolders = sourcePaths.map(source => ({
            Folder: source.path,
            Properties: source.properties || ''
        }));
        const result = await this.photomeshApi.photoApi.loadPhotoFolders(photoFolders);
        if (!result.isSuccess) {
            throw new Error(`Failed to load photos from folders: ${result.message}`);
        }
    }
    async loadPhotosFromVideo(source) {
        const properties = source.properties || '';
        const focalLength35 = source.focal35 || 24;
        await this.photomeshApi.photoApi.importPhotosFromVideo(source.path, properties, focalLength35);
    }
    async loadPhotosFromExcel(path) {
        await this.photomeshApi.photoApi.loadPhotosList(path);
    }
    async openOrCreateProject(projectPath, operation) {
        await api_1.projectApi.save();
        await api_1.projectApi.close();
        const currProject = await (0, queries_1.getProjectById)(this.project?.id);
        const globalVars = JSON.parse(currProject?.global_vars);
        await (operation === 'new'
            ? this.photomeshApi.projectApi.newProject(projectPath)
            : this.photomeshApi.projectApi.open(projectPath || globalVars.$$project_path));
        if (projectPath) {
            if (this.project) {
                this.project.global_vars = { ...globalVars, "$$project_path": projectPath };
            }
            await QueueRunner_1.queueRunner.updateProjectGlobals(this.project.id, '$$project_path', projectPath);
        }
    }
    async newProject(projectPath) {
        await this.openOrCreateProject(projectPath, 'new');
    }
    async openProject(projectPath) {
        await this.openOrCreateProject(projectPath, 'open');
    }
    async loadBuildVersion(task) {
        const buildVersions = await this.photomeshApi.projectApi.getBuildVersions();
        let latestBuildVersion = null;
        if (task.task_params.inheritBuild == null || task.task_params.inheritBuild == "" || task.task_params.inheritBuild == " ") {
            if (buildVersions.length > 0) {
                latestBuildVersion = buildVersions[buildVersions.length - 1].Name;
            }
        }
        else {
            latestBuildVersion = task.task_params.inheritBuild;
        }
        if (latestBuildVersion) {
            await this.photomeshApi.projectApi.loadBuildVersion(latestBuildVersion);
        }
    }
    async loadATArea(wkt) {
        await this.photomeshApi.areaApi.setATArea(wkt);
    }
    async loadReferenceProject(referenceProject) {
        await this.photomeshApi.referenceApi.setReferenceProject(referenceProject);
    }
    async startBuild(params) {
        const buildParams = {
            preset: params.preset || "PhotoMesh Default",
            buildFrom: params.buildFrom || 0,
            buildUntil: params.buildUntil || 0,
            workingFolder: params.workingFolder || "",
            clearErrors: params.clearErrors || false
        };
        if (params?.MaxLocalFusers) {
            await this.photomeshApi.buildApi.setMaxPoolFusers(params.MaxLocalFusers);
        }
        if (params?.MaxAWSFusers) {
            await this.photomeshApi.buildApi.setMaxAWSFusers(params.MaxAWSFusers);
        }
        if (params?.AWSBuildConfigurationName) {
            await this.photomeshApi.buildApi.setAWSBuildConfigurationName(params.AWSBuildConfigurationName);
        }
        if (params?.AWSBuildConfigurationJsonPath) {
            await this.photomeshApi.buildApi.setAWSBuildConfigurationJsonPath(params.AWSBuildConfigurationJsonPath);
        }
        if (params?.AWSFuserStartupScript) {
            await this.photomeshApi.buildApi.setAWSFuserStartupScript(params.AWSFuserStartupScript);
        }
        await this.photomeshApi.projectApi.startBuild(buildParams, this.currentTask?.project_id || 0);
    }
    async setReconstructionArea(wkt) {
        await this.photomeshApi.areaApi.setReconstructionArea(wkt);
    }
    async loadGCP(gcpPath) {
        await this.photomeshApi.gcpApi.importGCP(gcpPath);
    }
    async createNewBuildVersion(action) {
        const copyAT = action === types_1.PhotoMeshAction.NewBuildVersionCopyAT;
        await this.photomeshApi.projectApi.createNewBuildVersion(copyAT);
    }
    async handleBuildActions(task) {
        const isNewBuildVersion = (task.action === types_1.PhotoMeshAction.NewBuildVersion ||
            task.action === types_1.PhotoMeshAction.NewBuildVersionCopyAT);
        await this.openProject(task.task_params.projectPath);
        await this.loadBuildVersion(task);
        if (isNewBuildVersion) {
            if (task.task_params.ATAreaWkt) {
                await this.loadATArea(task.task_params.ATAreaWkt);
            }
            if (task.task_params.ReferenceProject) {
                await this.loadReferenceProject(task.task_params.ReferenceProject);
            }
        }
        if (task.task_params.ReconstructionAreaWkt) {
            await this.setReconstructionArea(task.task_params.ReconstructionAreaWkt);
        }
        if (task.task_params.gcpPath) {
            await this.loadGCP(task.task_params.gcpPath);
        }
        if (isNewBuildVersion) {
            await this.createNewBuildVersion(task.action);
        }
        await this.startBuild(task.task_params);
    }
    async loadPhotosListCSV(path, jsonAPI) {
        await this.photomeshApi.photoApi.loadPhotosListCSV(path, jsonAPI);
    }
    async loadGCPList(path, apiJson) {
        await this.photomeshApi.gcpApi.loadGCPList(path, apiJson);
    }
    async importTRJT(path) {
    }
    async start(task) {
        this.currentTask = task;
        try {
            switch (task.action) {
                case types_1.PhotoMeshAction.Pause:
                    if (QueueRunner_1.queueRunner) {
                        QueueRunner_1.queueRunner.pause();
                    }
                    return true;
                case types_1.PhotoMeshAction.EmptyProject:
                    await this.newProject(task.task_params.projectPath);
                    break;
                case types_1.PhotoMeshAction.OpenProject:
                    await this.openProject(task.task_params.projectPath);
                    break;
                case types_1.PhotoMeshAction.CreateNewProject:
                    await this.newProject(task.task_params.projectPath);
                    if (task.task_params.sourcePath) {
                        await this.handlePhotoLoading({
                            sourceType: task.task_params.sourceType,
                            sourcePath: task.task_params.sourcePath
                        });
                    }
                    if (task.task_params.gcpPath) {
                        await this.loadGCP(task.task_params.gcpPath);
                    }
                    if (task.task_params.AtAreaWkt) {
                        await this.loadATArea(task.task_params.AtAreaWkt);
                    }
                    if (task.task_params.ReferenceProject) {
                        await this.loadReferenceProject(task.task_params.ReferenceProject);
                    }
                    if (task.task_params.ReconstructionAreaWkt) {
                        await this.photomeshApi.areaApi.setReconstructionArea(task.task_params.ReconstructionAreaWkt);
                    }
                    if (task.task_params.buildFrom !== -1) {
                        await this.startBuild(task.task_params);
                    }
                    break;
                default:
                    const projectOpenSuccess = await this.ensureCorrectProjectOpen();
                    if (!projectOpenSuccess) {
                        throw new Error('Failed to ensure correct project is open');
                    }
                    switch (task.action) {
                        case types_1.PhotoMeshAction.Build:
                        case types_1.PhotoMeshAction.BuildErrorTiles:
                        case types_1.PhotoMeshAction.NewBuildVersion:
                        case types_1.PhotoMeshAction.NewBuildVersionCopyAT:
                            await this.handleBuildActions(task);
                            break;
                        case types_1.PhotoMeshAction.LoadPhotosListCSV:
                            await this.loadPhotosListCSV(task.task_params.filePath, task.task_params.jsonAPI);
                            break;
                        case types_1.PhotoMeshAction.LoadGCPList:
                            await this.loadGCPList(task.task_params.filePath, task.task_params.jsonAPI);
                            break;
                        case types_1.PhotoMeshAction.ImportTRJT:
                            await this.importTRJT(task.task_params.filePath);
                            break;
                        case types_1.PhotoMeshAction.LoadGCP:
                            await this.loadGCP(task.task_params.GcpFilePath);
                            break;
                        case types_1.PhotoMeshAction.LoadPhotos:
                            if (task.task_params.sourcePath) {
                                await this.handlePhotoLoading({
                                    sourceType: task.task_params.sourceType,
                                    sourcePath: task.task_params.sourcePath
                                });
                            }
                            break;
                        default:
                            throw new Error(`Unsupported action: ${task.action}`);
                    }
            }
            return true;
        }
        catch (error) {
            this.currentTask = null;
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error occurred');
        }
    }
    async stop() {
        await this.photomeshApi.projectApi.cancelBuild();
    }
    async abort() {
        const buildActions = [
            types_1.PhotoMeshAction.Build,
            types_1.PhotoMeshAction.BuildErrorTiles,
            types_1.PhotoMeshAction.NewBuildVersion,
            types_1.PhotoMeshAction.NewBuildVersionCopyAT
        ];
        if (this.currentTask?.action && buildActions.includes(this.currentTask.action)) {
            await api_1.projectApi.cancelBuild();
        }
        else {
            await api_1.projectApi.close();
        }
        this.currentTask = null;
        await super.abort();
    }
    async ensureCorrectProjectOpen() {
        const globalVarsString = await (0, dbHelpers_1.withRetry)(queries_1.getGlobalVars, [this.project.id]);
        if (!globalVarsString) {
            await this.logMessage('Project path not set in global variables', 'failed');
            return false;
        }
        const globalVars = JSON.parse(globalVarsString);
        if (!globalVars.$$project_path) {
            await this.logMessage('Project path not set in global variables', 'failed');
            return false;
        }
        try {
            const status = await api_1.projectApi.getStatus();
            // Normalize paths by trimming whitespace and ensuring consistent path separators
            const normalizedStatusPath = status?.ProjectPath?.trim().replace(/\\/g, '\\');
            const normalizedGlobalPath = globalVars.$$project_path?.trim().replace(/\\/g, '\\');
            if (!status || !('ProjectPath' in status) || normalizedStatusPath !== normalizedGlobalPath) {
                await api_1.projectApi.open(globalVars.$$project_path);
                await this.logMessage(`Opened project: ${globalVars.$$project_path}`, 'running');
            }
            return true;
        }
        catch (error) {
            await this.logMessage(`Failed to ensure correct project is open: ${error instanceof Error ? error.message : 'Unknown error'}`, 'failed');
            return false;
        }
    }
}
exports.PhotoMeshTaskRunner = PhotoMeshTaskRunner;
