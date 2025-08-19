import { PhotoSource, ProjectSourcePath, SourceType, Task, PhotoMeshAction, Project } from '../../types/types';
import { BaseTaskRunner } from './BaseTaskRunner';
import * as PhotoMeshApi from '../../Photomesh/api';
import { projectApi } from '../../Photomesh/api';
import { queueRunner } from '../QueueRunner';
import { withRetry } from '../../database/dbHelpers';
import { getGlobalVars, getProjectById } from '../../database/queries';
import { sseManager } from "../SseManager";

export class PhotoMeshTaskRunner extends BaseTaskRunner {
  private photomeshApi: typeof PhotoMeshApi;
  private readonly PHOTO_LOAD_DELAY = 5000;
  private currentTask: Task | null = null;

  constructor() {
    super();
    this.photomeshApi = PhotoMeshApi;
  }

  private async handlePhotoLoading(sourceData: ProjectSourcePath): Promise<void> {
    switch (sourceData.sourceType) {
      case SourceType.Folder:
        await this.loadPhotosFromFolder(sourceData.sourcePath);
        break;

      case SourceType.Video:
        await this.loadPhotosFromVideo(sourceData.sourcePath[0]);
        break;

      case SourceType.Excel:
        await this.loadPhotosFromExcel(sourceData.sourcePath[0].path);
        break;

      default:
        throw new Error(`Unsupported source type: ${sourceData.sourceType}`);
    }

    await new Promise(resolve => setTimeout(resolve, this.PHOTO_LOAD_DELAY));
  }

  private async loadPhotosFromFolder(sourcePaths: PhotoSource[]): Promise<void> {
    const photoFolders = sourcePaths.map(source => ({
      Folder: source.path,
      Properties: source.properties || ''
    }));

    const result = await this.photomeshApi.photoApi.loadPhotoFolders(photoFolders);
    if (!result.isSuccess) {
      throw new Error(`Failed to load photos from folders: ${result.message}`);
    }
  }

  private async loadPhotosFromVideo(source: PhotoSource): Promise<void> {
    const properties = source.properties || '';
    const focalLength35 = source.focal35 || 24;

    await this.photomeshApi.photoApi.importPhotosFromVideo(
      source.path,
      properties,
      focalLength35
    );

  }

  private async loadPhotosFromExcel(path: string): Promise<void> {
    await this.photomeshApi.photoApi.loadPhotosList(path);
  }

  private async openOrCreateProject(projectPath: string, operation: 'new' | 'open'): Promise<void> {
    await projectApi.save();
    await projectApi.close();
    const currProject = await getProjectById(this.project?.id!)

    const globalVars = JSON.parse(currProject?.global_vars);
    await (operation === 'new'
      ? this.photomeshApi.projectApi.newProject(projectPath)
      : this.photomeshApi.projectApi.open(projectPath || globalVars.$$project_path));

    if (projectPath) {
      if (this.project) {
        this.project.global_vars = { ...globalVars, "$$project_path": projectPath };
      }

      await queueRunner.updateProjectGlobals(this.project!.id!, '$$project_path', projectPath);
    }
  }

  private async newProject(projectPath: string): Promise<void> {
    await this.openOrCreateProject(projectPath, 'new');
  }

  private async openProject(projectPath: string): Promise<void> {
    await this.openOrCreateProject(projectPath, 'open');
  }

  private async loadBuildVersion(task: Task): Promise<void> {
    const buildVersions = await this.photomeshApi.projectApi.getBuildVersions();
    let latestBuildVersion = null;

    if (task.task_params.inheritBuild == null || task.task_params.inheritBuild == "" || task.task_params.inheritBuild == " ") {
      if (buildVersions.length > 0) {
        latestBuildVersion = buildVersions[buildVersions.length - 1].Name;
      }
    } else {
      latestBuildVersion = task.task_params.inheritBuild;
    }

    if (latestBuildVersion) {
      await this.photomeshApi.projectApi.loadBuildVersion(latestBuildVersion);
    }
  }

  private async loadATArea(wkt: string): Promise<void> {
    await this.photomeshApi.areaApi.setATArea(wkt);
  }

  private async loadReferenceProject(referenceProject: string): Promise<void> {
    await this.photomeshApi.referenceApi.setReferenceProject(referenceProject);
  }

  private async startBuild(params: any): Promise<void> {
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

  private async setReconstructionArea(wkt: string): Promise<void> {
    await this.photomeshApi.areaApi.setReconstructionArea(wkt);
  }

  private async loadGCP(gcpPath: string): Promise<void> {
    await this.photomeshApi.gcpApi.importGCP(gcpPath);
  }

  private async createNewBuildVersion(action: PhotoMeshAction): Promise<void> {
    const copyAT = action === PhotoMeshAction.NewBuildVersionCopyAT;
    await this.photomeshApi.projectApi.createNewBuildVersion(copyAT);
  }

  private async handleBuildActions(task: Task): Promise<void> {
    const isNewBuildVersion = (
      task.action === PhotoMeshAction.NewBuildVersion ||
      task.action === PhotoMeshAction.NewBuildVersionCopyAT
    );

    await this.openProject(task.task_params.projectPath);
    await this.loadBuildVersion(task);

    if (task.action === PhotoMeshAction.NewBuildVersion) {
      await projectApi.exitFromReviewMode();
    }

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

  private async loadPhotosListCSV(path: string, jsonAPI: string): Promise<void> {
    await this.photomeshApi.photoApi.loadPhotosListCSV(path, jsonAPI);
  }

  private async loadGCPList(path: string, apiJson: string): Promise<void> {
    await this.photomeshApi.gcpApi.loadGCPList(path, apiJson);
  }

  private async importTRJT(path: string): Promise<void> {
  }

  async start(task: Task): Promise<boolean> {
    this.currentTask = task;
    try {
      switch (task.action) {
        case PhotoMeshAction.Pause:
          if (queueRunner) {
            queueRunner.pause();
          }
          return true;

        case PhotoMeshAction.EmptyProject:
          await this.newProject(task.task_params.projectPath);
          break;

        case PhotoMeshAction.OpenProject:
          await this.openProject(task.task_params.projectPath);
          break;

        case PhotoMeshAction.CreateNewProject:
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
            await this.loadATArea(task.task_params.ATAreaWkt);
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
            case PhotoMeshAction.Build:
            case PhotoMeshAction.BuildErrorTiles:
            case PhotoMeshAction.NewBuildVersion:
            case PhotoMeshAction.NewBuildVersionCopyAT:
              await this.handleBuildActions(task);
              break;

            case PhotoMeshAction.LoadPhotosListCSV:
              await this.loadPhotosListCSV(task.task_params.filePath, task.task_params.jsonAPI);
              break;

            case PhotoMeshAction.LoadGCPList:
              await this.loadGCPList(task.task_params.filePath, task.task_params.jsonAPI);
              break;

            case PhotoMeshAction.ImportTRJT:
              await this.importTRJT(task.task_params.filePath);
              break;

            case PhotoMeshAction.LoadGCP:
              await this.loadGCP(task.task_params.GcpFilePath);
              break;

            case PhotoMeshAction.LoadPhotos:
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
    } catch (error) {
      this.currentTask = null;
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async stop(): Promise<void> {
    await this.photomeshApi.projectApi.cancelBuild();
  }

  async abort(): Promise<void> {
    const buildActions = [
      PhotoMeshAction.Build,
      PhotoMeshAction.BuildErrorTiles,
      PhotoMeshAction.NewBuildVersion,
      PhotoMeshAction.NewBuildVersionCopyAT
    ];

    if (this.currentTask?.action && buildActions.includes(this.currentTask.action)) {
      await projectApi.cancelBuild();
    }
    else {
      await projectApi.close();
    }


    this.currentTask = null;
    await super.abort();
  }

  protected async ensureCorrectProjectOpen(): Promise<boolean> {
    const globalVarsString = await withRetry<any | undefined>(getGlobalVars, [this.project!.id!]);
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
      const status = await projectApi.getStatus();
      // Normalize paths by trimming whitespace and ensuring consistent path separators
      const normalizedStatusPath = status?.ProjectPath?.trim().replace(/\\/g, '\\');
      const normalizedGlobalPath = globalVars.$$project_path?.trim().replace(/\\/g, '\\');

      if (!status || !('ProjectPath' in status) || normalizedStatusPath !== normalizedGlobalPath) {
        await projectApi.open(globalVars.$$project_path);
        await this.logMessage(`Opened project: ${globalVars.$$project_path}`, 'running');
      }
      return true;
    } catch (error) {
      await this.logMessage(`Failed to ensure correct project is open: ${error instanceof Error ? error.message : 'Unknown error'}`, 'failed');
      return false;
    }
  }
} 