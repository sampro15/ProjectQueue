import axios from "axios";
import { escape } from "querystring";
import { EventSource } from "eventsource";
import dotenv from "dotenv";
import { PhotomeshStatus, Project, ProjectStatus } from "../types/types";
import { sseManager } from "../services/SseManager";

dotenv.config();

// Add delay wrapper utility
const API_CALL_DELAY = 500; // 0.5 second delay

function withDelay<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY));
    return fn(...args);
  }) as T;
}

function wrapApiWithDelay<T extends Record<string, any>>(api: T): T {
  const wrapped: any = {};
  for (const key in api) {
    if (typeof api[key] === 'function') {
      wrapped[key] = withDelay(api[key].bind(api));
    } else {
      wrapped[key] = api[key];
    }
  }
  return wrapped;
}

function waitForEvent(
  eventSource: EventSource,
  eventName: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      eventSource.removeEventListener(eventName, handler);
      try {
        const result = JSON.parse(event.data as string);
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
        } else {
          reject(new Error(result.message || "Operation failed"));
        }
      } catch (error) {
        reject(error);
      }
    };
    eventSource.addEventListener(eventName, handler);
  });
}

export type BuildVersionResponse = {
  Name: string;
  projectPath?: string;
  // Add other properties as needed
};

export type OutputTypeEnum = {
  XPL3: 1;
  DAE: 2;
  OBJ: 4;
  OSGB: 8;
  Cesium: 32;
  LAS: 64;
  I3S: 128;
  Orthophoto: 1024;
  DSM: 2048;
  DTM: 4196;
  O3DML: 8392;
};

export type BuildFinishResult = {
  result?: "Success" | "FinishedWithErrors" | "Cancelled" | "Failed";
  message?: string;
  outputs?: { [key in keyof OutputTypeEnum]?: string };
};

export type ATReportItem = {
  Name: string;
};

export type VersionInfo = {
  _Major: number;
  _Minor: number;
  _Build: number;
  _Revision: number;
};

export type HealthCheckResult = {
  isAlive: boolean;
  version: string | null;
};

let baseURL = `http://${process.env.PHOTOMESH_EXE_SERVER_URL}:${process.env.PHOTOMESH_EXE_SERVER_PORT}`;

// Event Source Management
class EventSourceSingleton {
    private static instance: EventSourceSingleton;
    private eventSource: EventSource;

    private constructor() {
        this.eventSource = new EventSource(`${baseURL}/Events/All`);
        
        // Set up Progress event listener
        this.eventSource.addEventListener("Progress", ((event: MessageEvent<unknown>) => {
            try {
                const progressData = JSON.parse(event.data as string);
                // Check for AT completion based on Progress event
                if (
                    progressData.stage === "MARKER_PROJECT_BUNDLE_MERGE" &&
                    progressData.status === 2
                ) {
                    const project = sseManager.getCurrentProject();
                    if (project) {
                        sseManager.sendATCompleted(project);
                    }
                }
            } catch (error) {
                console.error("Error processing Progress event:", error);
            }
        }) as EventListener);
    }

    public static getInstance(): EventSourceSingleton {
        if (!EventSourceSingleton.instance) {
            EventSourceSingleton.instance = new EventSourceSingleton();
        }
        return EventSourceSingleton.instance;
    }

    public getEventSource(): EventSource {
        return this.eventSource;
    }
}

// Initialize the singleton instance at startup
const eventSourceSingleton = EventSourceSingleton.getInstance();

// Project Management
export interface ProjectApi {
  getVersion(): Promise<BuildVersionResponse>;
  save(): Promise<void>;
  close(): Promise<void>;
  open(projectPath: string): Promise<void>;
  newProject(projectPath: string): Promise<void>;
  getBuildVersions(): Promise<BuildVersionResponse[]>;
  loadBuildVersion(buildName: string): Promise<void>;
  getATReport(): Promise<ATReportItem[]>;
  getATDetailedReport(): Promise<string>;
  cancelBuild(): Promise<void>;
  createNewBuildVersion(copyAT: boolean, name?: string): Promise<void>;
  startBuild(params: BuildParams, projectId: number): Promise<void>;
  getStatus(): Promise<PhotomeshStatus>;
  exitFromReviewMode(): Promise<void>;
}

export interface BuildParams {
  preset: string;
  buildFrom: number;
  buildUntil: number;
  workingFolder: string;
  clearErrors: boolean;
}

// Wrap all API objects with delay
export const projectApi = wrapApiWithDelay({
  async getVersion(): Promise<VersionInfo> {
    const response = await axios.get<VersionInfo>(`${baseURL}/Project/GetVersion`);
    return response.data;
  },

  async save(): Promise<void> {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.get(`${baseURL}/Project/Save/`);
      let res = await waitForEvent(eventSource, "SaveFinished");
      if(!res.isSuccess)
        {
          throw 'Could not save project';
        }

    } catch (error) {
      throw error;
    }
  },

  async close(): Promise<void> {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.get(`${baseURL}/Project/CloseProject`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      throw error;
    }
  },

  async open(projectPath: string) {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.get(`${baseURL}/Project/Open/${escape(escape(projectPath))}`);
      const result = await waitForEvent(eventSource, "OpenFinished");
      return result;
    } catch (error) {
      throw error;
    }
  },

  async newProject(projectPath: string) {
    return await axios.get(
      `${baseURL}/Project/New/${escape(escape(projectPath))}`
    );
  },

  async getBuildVersions(): Promise<BuildVersionResponse[]> {
    const response = await axios.get(`${baseURL}/Project/BuildVersions`);
    return response.data;
  },

  async loadBuildVersion(buildName: string): Promise<void> {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.get(
        `${baseURL}/Project/LoadBuildVersion/${escape(escape(buildName))}?saveCurrentBuild=true&forceUpgrade=true`
      );
      await waitForEvent(eventSource, "OpenFinished");
    } catch (error) {
      throw error;
    }
  },

  async getATReport(): Promise<ATReportItem[]> {
    const response = await axios.get(`${baseURL}/Project/ATReport`);
    return response.data;
  },

  async getATDetailedReport(): Promise<string> {
    const response = await axios.get(`${baseURL}/Project/ATDetailedReport`);
    return response.data;
  },

  async cancelBuild() {
    return axios.get(`${baseURL}/Project/CancelBuild/`);
  },

  async createNewBuildVersion(
    copyAT: boolean,
    name: string = ""
  ): Promise<void> {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      const url = `/Project/NewBuildVersion/${name}?CopyAT=${copyAT}`;
      await axios.get(baseURL + url);
      const result = await waitForEvent(eventSource, "NewBuildVersionFinished");
      return result;
    } catch (error) {
      throw error;
    }
  },

  async startBuild(params: BuildParams, projectId: number): Promise<void> {
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
      const buildSteps = `?BuildFrom=${stages[params.buildFrom]}&BuildUntil=${
        stages[params.buildUntil]
      }`;
      const workingFolder = params.workingFolder
        ? `&WorkingFolder=${encodeURIComponent(params.workingFolder)}`
        : "";
      const clearErrors = params.clearErrors
        ? `&ClearErrors=${params.clearErrors}`
        : "";

      const url = `/Project/Build/${encodeURIComponent(
        params.preset
      )}${buildSteps}${workingFolder}${clearErrors}`;

      const project: Project = {
        id: projectId,
        project_key: projectId.toString(),
        manager: "",
        is_active: true,
        global_vars: {},
        status: "running" as ProjectStatus,
        tasks: [],
      };

      // Store the current project in SSE manager for Progress events to access
      sseManager.setCurrentProject(project);

      // First make the API call
      await axios.get(baseURL + url);

      const result = await waitForEvent(eventSource, "BuildFinished");
      const buildFinishedResult = result as BuildFinishResult;

      // Handle build completion without AT specific logic
      if (
        buildFinishedResult.result === "Success" ||
        buildFinishedResult.result === "FinishedWithErrors"
      ) {
        // sseManager.sendFinished(project); // 
        return;
      } else if (buildFinishedResult.result === "Cancelled") {
        sseManager.sendAborted(project);
        throw new Error("Build was cancelled");
      } else {
        sseManager.sendBuildFailed(project);
        throw new Error(buildFinishedResult.message || "Build failed");
      }
    } catch (error) {
      throw error;
    }
  },

  async exitFromReviewMode(): Promise<void> {
    try {
      await axios.get(`${baseURL}/Project/ExitFromReviewMode`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      throw error;
    }
  },

  async getStatus(): Promise<PhotomeshStatus> {
    const response = await axios.get(`${baseURL}/Project/GetStatus`);
    return response.data;
  },
});

// Build Management
export interface BuildApi {
  setMaxPoolFusers(count: number): Promise<void>;
  setMaxAWSFusers(count: number): Promise<void>;
  setAWSBuildConfigurationName(name: string): Promise<void>;
  setAWSBuildConfigurationJsonPath(path: string): Promise<void>;
  setAWSFuserStartupScript(script: string): Promise<void>;
  buildRerunErrorTiles(
    preset: string,
    buildSteps: string,
    workingFolder?: string,
    clearErrors?: string
  ): Promise<void>;
}

// Wrap all API objects with delay
export const buildApi = wrapApiWithDelay({
  async setMaxPoolFusers(count: number): Promise<void> {
    try {
      await axios.put(`${baseURL}/Build/MaxPoolFusers/${count}`);
    } catch (error) {
      console.error("Error setting max pool fusers:", error);
      throw error;
    }
  },

  async setMaxAWSFusers(count: number): Promise<void> {
    return axios.put(`${baseURL}/Build/MaxAWSFusers/${count}`);
  },

  async setAWSBuildConfigurationName(name: string): Promise<void> {
    return axios.get(`${baseURL}/Build/AWSBuildConfigurationName/${name}`);
  },

  async setAWSBuildConfigurationJsonPath(path: string): Promise<void> {
    return axios.get(
      `${baseURL}/Build/AWSBuildConfigurationJsonPath/${path}`
    );
  },

  async setAWSFuserStartupScript(script: string): Promise<void> {
    return axios.post(`${baseURL}/Build/AWSFuserStartupScript`, script, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
  async buildRerunErrorTiles(
    preset: string,
    buildSteps: string,
    workingFolder?: string,
    clearErrors?: string
  ): Promise<void> {
    const folderParam = workingFolder
      ? `&WorkingFolder=${escape(workingFolder)}`
      : "";
    const errorsParam = clearErrors ? `&ClearErrors=${clearErrors}` : "";

    return axios.get(
      `${baseURL}/Project/BuildRerunErrorTiles/${escape(
        preset
      )}${buildSteps}${folderParam}${errorsParam}`
    );
  },
});

// Photo Management
export const photoApi = wrapApiWithDelay({
  async loadPhotoFolders(
    photoFolders: Array<{ Folder: string; Properties: string }>
  ) {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.post(`${baseURL}/Project/LoadPhotoFolders`, photoFolders, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await waitForEvent(eventSource, "LoadPhotosFinished");
      if (!result.isSuccess) {
        throw new Error(result.message || "Failed to load photo folders");
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  async importPhotosFromVideo(
    videoPath: string,
    properties: string,
    focalLength35?: number
  ) {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      const focalParam = focalLength35
        ? `&focalLength35=${focalLength35}`
        : "&focalLength35=24";
      await axios.get(
        `${baseURL}/Project/ImportPhotosFromVideo?videoFullPath=${escape(
          videoPath
        )}&properties=${escape(properties)}${focalParam}`
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      throw error;
    }
  },

  async loadPhotosList(path: string) {
    const eventSource = eventSourceSingleton.getEventSource();
    try {
      await axios.get(
        `${baseURL}/Project/LoadPhotosList/${escape(escape(path))}`
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      throw error;
    }
  },

  async loadPhotosListCSV(path: string, jsonAPI: string) {
    return axios.post(
      `${baseURL}/Project/LoadPhotosListCSV/${escape(escape(path))}`,
      jsonAPI,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
});

// GCP Management
export const gcpApi = wrapApiWithDelay({
  async importGCP(gcpFileList: string) {
    return axios.get(
      `${baseURL}/Project/ImportGCP?gcpFileList=${escape(gcpFileList)}`
    );
  },

  async loadGCPList(path: string, jsonAPI: string) {
    return axios.post(
      `${baseURL}/Project/LoadGCPList/${escape(escape(path))}`,
      jsonAPI,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
});

// Area Management
export const areaApi = wrapApiWithDelay({
  async setATArea(wkt: string) {
    return axios.put(`${baseURL}/Project/ATArea/`, JSON.stringify(wkt), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  async setReconstructionArea(wkt: string) {
    return axios.put(
      `${baseURL}/Project/ReconstructionArea/`,
      JSON.stringify(wkt),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
});

// Reference Project Management
export const referenceApi = wrapApiWithDelay({
  async setReferenceProject(referenceProject: string) {
    return axios.get(
      `${baseURL}/Project/ReferenceProject?referenceProject=${referenceProject}`
    );
  },
});

// Add this new API object after the other API exports
export const healthApi = wrapApiWithDelay({
  async checkAlive(): Promise<HealthCheckResult> {
    try {
      const response = await axios.get<VersionInfo>(
        `${baseURL}/Project/GetVersion`
      );
      const version = `${response.data._Major}.${response.data._Minor}.${response.data._Build}.${response.data._Revision}`;

      return {
        isAlive: true,
        version,
      };
    } catch (error) {
      return {
        isAlive: false,
        version: null,
      };
    }
  },

  startPeriodicCheck(
    intervalMs: number = 2000,
    onStatusChange?: (status: HealthCheckResult) => void
  ) {
    let lastStatus: boolean | null = null;

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
});
