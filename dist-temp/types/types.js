"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusDescriptions = exports.QueueAction = exports.PhotoMeshAction = exports.QueueStatusType = exports.SourceType = exports.TaskTypes = void 0;
exports.TaskTypes = [
    'PhotoMesh',
    'Queue',
];
var SourceType;
(function (SourceType) {
    SourceType[SourceType["Folder"] = 0] = "Folder";
    SourceType[SourceType["Video"] = 1] = "Video";
    SourceType[SourceType["Excel"] = 2] = "Excel";
})(SourceType || (exports.SourceType = SourceType = {}));
var QueueStatusType;
(function (QueueStatusType) {
    QueueStatusType["PENDING"] = "pending";
    QueueStatusType["RUNNING"] = "running";
    QueueStatusType["PAUSED"] = "paused";
    QueueStatusType["STOPPED"] = "stopped";
    QueueStatusType["ABORTING"] = "aborting";
})(QueueStatusType || (exports.QueueStatusType = QueueStatusType = {}));
var PhotoMeshAction;
(function (PhotoMeshAction) {
    PhotoMeshAction[PhotoMeshAction["EmptyProject"] = -1] = "EmptyProject";
    PhotoMeshAction[PhotoMeshAction["CreateNewProject"] = 0] = "CreateNewProject";
    PhotoMeshAction[PhotoMeshAction["NewBuildVersion"] = 1] = "NewBuildVersion";
    PhotoMeshAction[PhotoMeshAction["NewBuildVersionCopyAT"] = 2] = "NewBuildVersionCopyAT";
    PhotoMeshAction[PhotoMeshAction["Build"] = 3] = "Build";
    PhotoMeshAction[PhotoMeshAction["Pause"] = 4] = "Pause";
    PhotoMeshAction[PhotoMeshAction["Script"] = 5] = "Script";
    PhotoMeshAction[PhotoMeshAction["BuildErrorTiles"] = 6] = "BuildErrorTiles";
    PhotoMeshAction[PhotoMeshAction["LoadPhotosListCSV"] = 7] = "LoadPhotosListCSV";
    PhotoMeshAction[PhotoMeshAction["LoadGCPList"] = 8] = "LoadGCPList";
    PhotoMeshAction[PhotoMeshAction["ImportTRJT"] = 9] = "ImportTRJT";
    PhotoMeshAction[PhotoMeshAction["LoadGCP"] = 10] = "LoadGCP";
    PhotoMeshAction[PhotoMeshAction["LoadPhotos"] = 11] = "LoadPhotos";
    PhotoMeshAction[PhotoMeshAction["OpenProject"] = 12] = "OpenProject";
})(PhotoMeshAction || (exports.PhotoMeshAction = PhotoMeshAction = {}));
var QueueAction;
(function (QueueAction) {
    QueueAction[QueueAction["Script"] = 0] = "Script";
    QueueAction[QueueAction["Pause"] = 4] = "Pause";
})(QueueAction || (exports.QueueAction = QueueAction = {}));
exports.HttpStatusDescriptions = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable"
};
