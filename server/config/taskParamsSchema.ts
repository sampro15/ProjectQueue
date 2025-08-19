// taskParamsSchema.ts
export const taskParamsSchema = {
    task_params: {
      type: 'object',
      description: 'Object with nested parameters specific to the task, detailing configurations and settings relevant to the specified action.',
      properties: {
        saveAt: {
          type: 'string',
          description: 'Directory path where the results of the task are stored. This property is applied only for tasks that produce output files.',
          example: 'C:/Projects/Output',
        },
        projectPath: {
          type: 'string',
          description: 'The full path to the PhotoMeshXML project file. This parameter is applied only for tasks related to project creation, modification, or processing.',
          example: 'C:/Projects/AerialSurvey/Survey.PhotoMeshXML',
        },
        buildFrom: {
          type: 'integer',
          description: 'The step from which to start the build. The following are the possible values: 0: Auto, 1: Data Preparation, 2: AT (Aerotriangulation), 3: Point Cloud, 4: Model, 5: Texturing, 6: Output',
          minimum: 0,
          maximum: 6,
          example: 1,
        },
        buildUntil: {
          type: 'integer',
          description: 'The step until which to perform the build.',
          minimum: 0,
          maximum: 6,
          example: 6,
        },
        preset: {
          type: 'string',
          description: 'The name of the preset file to be loaded by PhotoMesh.',
          example: 'Standard_GPS',
        },
        sourceType: {
          type: 'integer',
          description: 'The source type of the project\'s photo information. This parameter is applied only when creating a new project (action = 0).',
          enum: [0, 1, 2],
        },
        sourcePath: {
          type: 'array',
          description: 'The source path of the project\'s photo information. This parameter is applied only when creating a new project (action = 0).',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Collection name' },
              path: { type: 'string', description: 'Full path to the source' },
              properties: { type: 'string', description: 'Path to collectionProperties.xml (optional for folders)' },
              focalLength35: { type: 'number', description: 'Focal length in 35mm equivalent (for video)' },
              frameEvery: { type: 'integer', description: 'Frame sampling interval (for video)' },
              startTime: { type: 'string', description: 'Start time for video extraction' },
              endTime: { type: 'string', description: 'End time for video extraction' },
            },
          },
        },
        inheritBuild: {
          type: 'string',
          description: 'The name of the build version from which to inherit the project\'s base build parameters.',
          example: 'Build_1',
        },
        ATAreaWkt: {
          type: 'string',
          description: 'A WKT string defining the area of the project on which PhotoMesh should perform aerotriangulation.',
          example: 'POLYGON((35.0 31.0, 35.1 31.0, 35.1 31.1, 35.0 31.1, 35.0 31.0))',
        },
        ReconstructionAreaWkt: {
          type: 'string',
          description: 'A WKT string defining the area of the project on which PhotoMesh should perform reconstruction.',
          example: 'POLYGON((35.0 31.0, 35.1 31.0, 35.1 31.1, 35.0 31.1, 35.0 31.0))',
        },
        MaxLocalFusers: {
          type: 'integer',
          description: 'The maximum number of pool fusers to use for the build.',
          minimum: 0,
          example: 12,
        },
        MaxAWSFusers: {
          type: 'integer',
          description: 'The maximum number of Amazon Web Services (AWS) fuser instances to launch for the build.',
          minimum: 0,
          example: 0,
        },
        AWSFuserStartupScript: {
          type: 'string',
          description: 'The startup script PhotoMesh should use when launching AWS fuser instances.',
          example: 'C:/Scripts/aws_startup.sh',
        },
        AWSBuildConfigurationName: {
          type: 'string',
          description: 'The name of the configuration JSON file PhotoMesh should use to determine which AWS instances to launch.',
          example: 'HighPerformanceConfig',
        },
        AWSBuildConfigurationJsonPath: {
          type: 'string',
          description: 'The path to the folder where the AWSBuildConfigurationName JSON file is saved.',
          default: './PhotoMesh/AWSConfigurations',
          example: 'C:/PhotoMesh/AWSConfigurations',
        },
        workingFolder: {
          type: 'string',
          description: 'Working folder path for build operations',
          example: 'N:/users/Projects/WorkingFolder',
        },
        scriptPath: {
          type: 'string',
          description: 'Path to script file for action 5',
          example: 'C:/Scripts/post_process.py',
        },
        scriptParams: {
          type: 'object',
          description: 'Key-value pairs of parameters to pass to the script',
          additionalProperties: true,
          example: {
            resolution: 0.5,
            format: 'OBJ',
            quality: 'high',
          },
        },
        jsonAPI: {
          type: 'object',
          description: 'File path and mapping information to map CSV/txt columns to properties.',
          properties: {
            filePath: { type: 'string', description: 'Path to file being imported or loaded.' },
            headers: {
              type: 'object',
              description: 'Key-value pair object that maps header names to their respective column numbers.',
              additionalProperties: true,
              example: {
                Name: '#1',
                X: '#2',
                Y: '#3',
                Altitude: '#4',
              },
            },
            headersAtRow: { type: 'integer', description: 'CSV/TXT file row where headers are found.' },
            dataAtRow: { type: 'integer', description: 'CSV/TXT file row that data starts at.' },
            headerSeparator: { type: 'string', description: 'Separator used for parsing header values in files.' },
            dataSeparator: { type: 'string', description: 'Separator used for parsing data values in files.' },
            coordinateSystem: { type: 'string', description: 'Coordinate system in WKT format or standard identifier.' },
            pointType: { type: 'integer', description: 'Type of control point (1 standard, 2 check point)' },
            haveNoHeaders: { type: 'boolean', description: 'Indicates whether the file lacks headers.' },
            selectedFolderPath: { type: 'string', description: 'Base folder path for referenced files (e.g., images)' },
            searchSubFolder: { type: 'boolean', description: 'Whether to search in subfolders for referenced files' },
            timespan: { type: 'integer', description: 'The interval at which the trajectory data is read.' },
            timeBase: { type: 'string', description: 'Base time value for timestamp adjustments of trajectory data.' },
          },
        },
        buildId: {
          type: 'string',
          description: 'ID of the build containing error tiles (action 6)',
          example: 'Build_2',
        },
        retryCount: {
          type: 'integer',
          description: 'Number of retry attempts for error tiles (action 6)',
          example: 3,
        },
        gcpPath: {
          type: 'string',
          description: 'Path to GCP file for loading (action 11)',
          example: 'C:/Projects/GCP/control_points.gcp',
        },
      },
    },
  };
  
  export default taskParamsSchema;
  