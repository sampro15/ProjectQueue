// In enums.jsx, define an array or object for reverse lookup
const eBuildActions = {
  createEmptyProject: -1,
    createNewProject: 0,
    newBuildVersion: 1,
    newBuildVersionCopyAT: 2,
    build: 3,
    pause: 4,
    script: 5,
    buildErrorTiles: 6,
    importNewCSV : 7,
    importGCP : 8,
    importTRJT : 9,
    loadPhotos : 10,
    loadGCP : 11
  };
  
  // Create a reverse lookup to map action numbers to their string keys
  const actionNames = Object.keys(eBuildActions).reduce((acc, key) => {
    acc[eBuildActions[key]] = key;
    return acc;
  }, {});
  
  export { eBuildActions, actionNames };
  