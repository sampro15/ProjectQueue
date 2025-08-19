import { QueueStatus } from "../services/QueueRunner";

export type TaskType = {
    id: number;
    name: string;
    description: string;
}

export const TaskTypes = [
    'PhotoMesh',
    'Queue',
] as const;

export type ProjectStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'aborted';

export type Project = {
    id?: number;
    project_key: string;
    manager: string;
    created_at?: Date;
    is_active: boolean;
    global_vars: any;
    tasks: Task[];
    order_index?: number;
    status: ProjectStatus;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the task
 *         project_id:
 *           type: integer
 *           description: ID of the project this task belongs to
 *         guid:
 *           type: string
 *           description: Global unique identifier for the task
 *         type:
 *           type: string
 *           description: Type of the task
 *         name:
 *           type: string
 *           nullable: true
 *           description: Optional name of the task
 *         comment:
 *           type: string
 *           nullable: true
 *           description: Optional comment for the task
 *         action:
 *           type: integer
 *           description: Action identifier for the task
 *         task_params:
 *           type: object
 *           description: JSON parameters for the task
 *         next_task_guid:
 *           type: string
 *           nullable: true
 *           description: GUID of the next task to execute on success
 *         custom_condition:
 *           type: string
 *           nullable: true
 *           description: Optional custom condition for task execution
 *         is_active:
 *           type: boolean
 *           description: Whether the task is active
 *         status:
 *           type: string
 *           description: Current status of the task
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the task was created
 *         started_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the task was started
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the task was completed
 *       required:
 *         - id
 *         - project_id
 *         - guid
 *         - type
 *         - action
 *         - task_params
 *         - is_active
 *         - status
 *         - created_at
 */
export type Task = {
    id: number;
    project_id: number;
    guid: string;
    type: typeof TaskTypes[number];
    name?: string;
    comment?: string;
    action: number;
    task_params: any; // JSONB type
    next_task_guid?: string;
    custom_condition?: string;
    is_active: boolean;
    status: TaskStatus;
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'aborted';

export type LogLevel = 'info' | 'warning' | 'error';

export type Log = {
    id: number;
    task_id: number;
    status?: TaskStatus;
    log_level: LogLevel;
    log_message?: string;
    timestamp: Date;
}

export type Version = {
    major: number;
    minor: number;
}

// View type
export type VersionView = {
    currentVersion: number;
    major: number;
    minor: number;
}

export type PhotomeshVersion = {
    Major: number;
    Minor: number;
    Build: number;
    Revision: number;
    MajorRevision: number;
    MinorRevision: number;
}

export type PhotomeshStatus = {
    PhotomeshVersion: PhotomeshVersion;
    BuildStatus: string;
    ProjectPath: string;
    BuildName: string | null;
    BuildGuid: string | null;
    BuildProgress: number | null;
    WorkingFolder: string;
    MaxAWSFusers: number;
    MaxPoolFusers: number;
    AWSBuildConfigurationName: string;
    PoolFolder: string;
    FuserFolder: string;
    Priority: number;
}

export interface PhotoSource {
    path: string;
    properties?: string;
    focal35?: number;
}

export interface ProjectSourcePath {
    sourceType: number;
    sourcePath: PhotoSource[];
}

export enum SourceType {
    Folder = 0,
    Video = 1,
    Excel = 2
}

export enum QueueStatusType {
    PENDING = 'pending',
    RUNNING = 'running',
    PAUSED = 'paused',
    STOPPED = 'stopped',
    ABORTING = 'aborting',
}

export enum PhotoMeshAction {
    EmptyProject = -1,
    CreateNewProject = 0,
    NewBuildVersion = 1,
    NewBuildVersionCopyAT = 2,
    Build = 3,
    Pause = 4,
    Script = 5,
    BuildErrorTiles = 6,
    LoadPhotosListCSV = 7,
    LoadGCPList = 8,
    ImportTRJT = 9,
    LoadGCP = 10,
    LoadPhotos = 11,
    OpenProject = 12
}

export enum QueueAction {
    Script = 0,
    Pause = 4,
}

export type TaskLogView = {
    id: number;
    task_id: number;
    task_guid: string;
    task_type: typeof TaskTypes[number];
    task_action: number;
    task_comment?: string;
    task_params: any;
    project_key: string;
    status: TaskStatus;
    log_message?: string;
    timestamp: Date;
}

export type pagination = {
    limit: number;
    offset: number;
    total?: number;
}

export interface Queue {
    projects: Project[];
    version?: string;
    status?: QueueStatusType;
    pagination?: pagination;
} 

export const HttpStatusDescriptions: { [key: number]: string } = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable"
};