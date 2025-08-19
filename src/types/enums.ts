// enums.ts

// Define a type for the enum keys
type QueueActionKeys = 
| 'script'
| 'pause';

type PhotoMeshActionKeys =
  | 'createEmptyProject'
  | 'createNewProject'
  | 'newBuildVersion'
  | 'newBuildVersionCopyAT'
  | 'build'
  | 'pause'
  | 'script'
  | 'buildErrorTiles'
  | 'importNewCSV'
  | 'importGCP'
  | 'importTRJT'
  | 'loadGCP'
  | 'loadPhotos'
  | 'openProject';

// Define a type for the enum
type QueueAction = {
  [key in QueueActionKeys]: number;
};
type PhotoMeshAction = {
  [key in PhotoMeshActionKeys]: number;
};

// Define the enums with appropriate typing
const eQueueActions: QueueAction = {
  script: 0,
  pause: 4,
};

const ePhotoMeshActions: PhotoMeshAction = {
  createEmptyProject: -1,
  createNewProject: 0,
  newBuildVersion: 1,
  newBuildVersionCopyAT: 2,
  build: 3,
  pause: 4,
  script: 5,
  buildErrorTiles: 6,
  importNewCSV: 7,
  importGCP: 8,
  importTRJT: 9,
  loadGCP: 10,
  loadPhotos: 11,
  openProject: 12,

};

// Create reverse lookup objects
const queueActionNames: { [key: number]: QueueActionKeys } = Object.keys(eQueueActions).reduce(
  (acc, key) => {
    const actionKey = key as QueueActionKeys;
    acc[eQueueActions[actionKey]] = actionKey;
    return acc;
  },
  {} as { [key: number]: QueueActionKeys }
);

const photoMeshActionNames: { [key: number]: PhotoMeshActionKeys } = Object.keys(ePhotoMeshActions).reduce(
  (acc, key) => {
    const actionKey = key as PhotoMeshActionKeys;
    acc[ePhotoMeshActions[actionKey]] = actionKey;
    return acc;
  },
  {} as { [key: number]: PhotoMeshActionKeys }
);

export { eQueueActions, ePhotoMeshActions, queueActionNames, photoMeshActionNames };