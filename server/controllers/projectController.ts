import { Router } from 'express';
import { projectApi } from '../Photomesh/api';
import { getErrorMessage } from '../utils/errorHandling';
import { addProject, removeProject, setNextTaskGuid, switchProjects as switchProjects, setGlobalVarsQueue, getGlobalVarsQueue, setNextTaskByName, setNextTaskGuidForCurrentTask, setNextTaskByNameForCurrentTask, addTasksToProject } from '../services/projectService';
import { addQueue } from '../services/queueService';
import { sseManager } from '../services/SseManager';

const router = Router();


router.post('/add', async (req, res) => {
    try {
        const queueData = req.body;
        const result = await addQueue(queueData);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to add to queue" });
    }
});

/**
 * @swagger
 * /project/remove:
 *   post:
 *     summary: Remove a project
 *     tags:
 *       - Project Management
 *     description: Removes a project from the system by its ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: integer
 *             required:
 *               - projectId
 *     responses:
 *       200:
 *         description: Project removed successfully
 *       400:
 *         description: Invalid project ID
 *       500:
 *         description: Failed to remove project
 */
router.post('/remove', async (req, res) => {
    try {
        const { projectId } = req.body;
        if (isNaN(projectId)) {
            res.status(400).json({ error: 'Invalid project ID' });
            return;
        }
        await removeProject(projectId);
        res.end();
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
});

/**
 * @swagger
 * /project/setGlobalVars:
 *   post:
 *     summary: Set global variables
 *     tags:
 *       - Project Management
 *     description: Sets global variables for a specific project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: integer
 *               globalVars:
 *                 type: object
 *             required:
 *               - projectId
 *               - globalVars
 *     responses:
 *       200:
 *         description: Global variables set successfully
 *       400:
 *         description: Invalid request data
 */
router.post("/setGlobalVars", async (req, res) => {
    try {
        const { projectId, globalVars } = req.body;
        await setGlobalVarsQueue(projectId, globalVars);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to set global vars" });
    }
});

/**
 * @swagger
 * /project/getGlobalVars:
 *   get:
 *     summary: Get global variables
 *     tags:
 *       - Project Management
 *     description: Retrieves global variables for a specific project
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the project
 *     responses:
 *       200:
 *         description: Global variables retrieved successfully
 *       400:
 *         description: Failed to get global variables
 */
router.get("/getGlobalVars", async (req, res) => {
    try {
        const { projectId } = req.query;
        const globalVars = await getGlobalVarsQueue(Number(projectId));
        res.json(globalVars);
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get global vars" });
    }
});

/**
 * @swagger
 * /project/switch:
 *   post:
 *     summary: Switch projects
 *     tags:
 *       - Project Management
 *     description: Switches the positions of two projects in the queue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId1:
 *                 type: integer
 *               projectId2:
 *                 type: integer
 *             required:
 *               - projectId1
 *               - projectId2
 *     responses:
 *       200:
 *         description: Projects switched successfully
 *       400:
 *         description: Invalid project IDs
 *       500:
 *         description: Failed to switch projects
 */
router.post('/switch', async (req, res) => {
    try {
        const { projectId1, projectId2 } = req.body;

        if (isNaN(projectId1) || isNaN(projectId2)) {
            res.status(400).json({ error: 'Invalid project ID' });
            return;
        }

        await switchProjects(projectId1, projectId2);
        res.end();
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
});

/**
 * @swagger
 * /project/getATSummary:
 *   get:
 *     summary: Get AT Summary
 *     tags:
 *       - Project Management
 *     description: Retrieves the Aerial Triangulation summary report
 *     responses:
 *       200:
 *         description: AT summary retrieved successfully
 *       500:
 *         description: Failed to get AT summary
 */
router.get('/getATSummary', async (req, res) => {
    try {
        const data = await projectApi.getATReport();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
});

/**
 * @swagger
 * /project/setNextTaskGuid:
 *   post:
 *     summary: Set next task GUID
 *     tags:
 *       - Project Management
 *     description: Sets the GUID for the next task in a project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskId:
 *                 type: integer
 *               nextTaskGuid:
 *                 type: string
 *             required:
 *               - taskId
 *               - nextTaskGuid
 *     responses:
 *       200:
 *         description: Next task GUID set successfully
 */
router.post('/setNextTaskGuid', async (req, res) => {
    const { taskId, nextTaskGuid } = req.body;
    await setNextTaskGuid(taskId, nextTaskGuid);
    res.end();
});


//not in use: will be deleted 
// /**
//  * @swagger
//  * /project/setNextTaskByName:
//  *   post:
//  *     summary: Set next task name
//  *     tags:
//  *       - Project Management
//  *     description: Sets the name for the next task in a project
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               taskId:
//  *                 type: integer
//  *               nextTaskName:
//  *                 type: string
//  *             required:
//  *               - taskId
//  *               - nextTaskName
//  *     responses:
//  *       200:
//  *         description: Next task name set successfully
//  */
// router.post('/setNextTaskByName', async (req, res) => {
//     const { taskId, nextTaskName } = req.body;
//     await setNextTaskByName(taskId, nextTaskName);
//     res.end();
// });

/**
 * @swagger
 * /project/setNextTaskGuidForCurrent:
 *   post:
 *     summary: Set next task GUID for currently running task
 *     tags:
 *       - Project Management
 *     description: Sets the GUID for the next task to run after the currently running task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nextTaskGuid:
 *                 type: string
 *             required:
 *               - nextTaskGuid
 *     responses:
 *       200:
 *         description: Next task GUID set successfully
 *       400:
 *         description: No task is currently running
 */
router.post('/setNextTaskGuidForCurrent', async (req, res) => {
    try {
        const { nextTaskGuid } = req.body;
        await setNextTaskGuidForCurrentTask(nextTaskGuid);
        res.end();
    } catch (error) {
        res.status(400).json({ error: getErrorMessage(error) });
    }
});

// /**
//  * @swagger
//  * /project/setNextTaskByNameForCurrent:
//  *   post:
//  *     summary: Set next task name for currently running task
//  *     tags:
//  *       - Project Management
//  *     description: Sets the name for the next task to run after the currently running task
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               nextTaskName:
//  *                 type: string
//  *             required:
//  *               - nextTaskName
//  *     responses:
//  *       200:
//  *         description: Next task name set successfully
//  *       400:
//  *         description: No task is currently running
//  */
// router.post('/setNextTaskByNameForCurrent', async (req, res) => {
//     try {
//         const { nextTaskName } = req.body;
//         await setNextTaskByNameForCurrentTask(nextTaskName);
//         res.end();
//     } catch (error) {
//         res.status(400).json({ error: getErrorMessage(error) });
//     }
// });

/**
 * @swagger
 * /project/addTasks:
 *   post:
 *     operationId: addTasks
 *     summary: Add tasks to a project
 *     description: Adds one or more tasks to an existing project identified by either project ID or project key
 *     tags:
 *       - Project Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectKey:
 *                 type: string
 *                 description: Project key to identify the project
 *               tasks:
 *                 type: array
 *                 description: List of tasks to add to the project
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - action
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum:
 *                         - PhotoMesh
 *                         - Queue
 *                       description: Type of task
 *                     action:
 *                       type: integer
 *                       description: |
 *                         Action code that defines what operation to perform:
 *                         
 *                         ## Queue Task Actions
 *                         - **0**: Run a specified script
 *                         - **4**: Pause queue task processing
 *                         
 *                         ## PhotoMesh Task Actions
 *                         - **-1**: Create an empty project file
 *                         - **0**: Create a new project with default settings  
 *                         - **1**: Create a new build version
 *                         - **2**: Create a new build version with a copy of the current AT results
 *                         - **3**: Execute a build process
 *                         - **4**: Pause project processing
 *                         - **6**: Process error tiles
 *                         - **7**: Import data from a CSV file
 *                         - **8**: Import ground control point data
 *                         - **10**: Load ground control point data
 *                         - **11**: Load photo data from folder or file
 *                         - **12**: Open an existing project
 *                     task_params:
 *                       type: object
 *                       description: Parameters specific to the task action. See the 
 *                         [task_params](#/components/schemas/task_params) schema for full documentation.
 *                       additionalProperties: true
 *                     comment:
 *                       type: string
 *                       description: Additional comments about the task
 *                     next_task_guid:
 *                       type: string
 *                       description: GUID of next task in the project that should be executed
 *                     status:
 *                       type: string
 *                       description: Current status of the task
 *             required:
 *               - tasks
 *           examples:
 *             CreateEmptyProject:
 *               summary: Create Empty Project (Action -1)
 *               value:
 *                 projectKey: empty-project
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Create Empty Project
 *                     action: -1
 *                     task_params:
 *                       projectPath: C:/Projects/1234321/1/1.PhotoMeshXML
 *             NewProjectFromFolder:
 *               summary: New project from folder (Action 0)
 *               value:
 *                 projectKey: folder-project
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: New project from folder
 *                     action: 0
 *                     task_params:
 *                       projectPath: C:/Projects/1234321/1/1.PhotoMeshXML
 *                       buildFrom: 1
 *                       buildUntil: 6
 *                       inheritBuild: ""
 *                       preset: PhotoMesh Default
 *                       workingFolder: C:/Projects/WorkingFolder
 *                       MaxLocalFusers: 10
 *                       MaxAWSFusers: 7
 *                       AWSFuserStartupScript: script
 *                       AWSBuildConfigurationName: AT_MultiCoreCPU
 *                       AWSBuildConfigurationJsonPath: ""
 *                       sourceType: 0
 *                       sourcePath:
 *                         - name: RGB
 *                           path: C:/Projects/212
 *                           properties: C:/Projects/212/data.xml
 *             AddNewBuild:
 *               summary: Add new build version task (Action 1)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Create a new build version
 *                     action: 1
 *                     task_params:
 *                       projectPath: C:/Projects/Example/Example.PhotoMeshXML
 *                       buildFrom: 2
 *                       buildUntil: 4
 *                       inheritBuild: Build_1
 *                       preset: W:/QA/Automation/Presets/Example.PMPreset
 *                       MaxLocalFusers: 16
 *             AddCopyBuild:
 *               summary: Add new build with copy of current AT task (Action 2)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Copy existing build as a new version
 *                     action: 2
 *                     task_params:
 *                       projectPath: C:/Projects/CopyExample/CopyExample.PhotoMeshXML
 *                       buildFrom: 0
 *                       buildUntil: 6
 *                       inheritBuild: Build_1_123
 *                       preset: PhotoMesh default
 *                       MaxLocalFusers: 20
 *             AddExecuteBuild:
 *               summary: Add execute build task with automatic calculation of AT area (Action 3)
 *               value:
 *                 projectKey: project-def-456
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Execute the build process
 *                     action: 3
 *                     task_params:
 *                       buildFrom: 1
 *                       buildUntil: 6
 *                       preset: PhotoMesh default
 *                       workingFolder: C:/Projects/WorkingFolder
 *                       MaxLocalFusers: 10
 *             AddExecuteBuild2:
 *               summary: Add execute build task including AT and reconstruction area WKTs (Action 3)
 *               value:
 *                 projectKey: project-def-456
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Execute the build process
 *                     action: 3
 *                     task_params:
 *                       buildFrom: 1
 *                       buildUntil: 6
 *                       preset: PhotoMesh default
 *                       ATAreaWkt: POLYGON Z ((6.56852487415021 46.5915684932987 0.0104926703497767, 6.5680336826834 46.5913970951883 0.0103219719603658, 6.56695133044283 46.5912831238015 0.0092630861327052, 6.56640831720097 46.59134562044 0.0084214741364121, 6.56589157496545 46.5914446281431 0.0076501108705997, 6.5655601735243 46.5915250437099 0.0071994801983237, 6.5652474442705 46.5916354141137 0.0066913273185492, 6.56405303339511 46.5921295553694 0.0054675815626979, 6.56375917223675 46.5922709022093 0.0053572561591864, 6.56349616579304 46.5924386621434 0.0051988884806633, 6.56305971572875 46.5927580905968 0.0050631212070584, 6.56277439493727 46.5930078778067 0.0050623929128051, 6.56241523127163 46.5935908528052 0.0048407837748528, 6.56237138369332 46.5942235046339 0.0043535362929106, 6.56247098329051 46.5945339310851 0.0040284255519509, 6.56286729232687 46.5953982357811 0.0038361875340343, 6.56309687529703 46.5957570830402 0.004065066576004, 6.56386207749858 46.5963312955334 0.0042940583080053, 6.56436134335269 46.5965193788969 0.0042827343568206, 6.56669786198042 46.5971831733814 0.0069808261469007, 6.5674236912121 46.5973093381441 0.0085588721558452, 6.56817162791066 46.5972883045054 0.0098582990467548, 6.5685366802536 46.5972412981384 0.0104763153940439, 6.56894107551418 46.5971656377406 0.0111821535974741, 6.56967170390951 46.5968864883598 0.0121617615222931, 6.56997909782021 46.5966901974147 0.0124103827401996, 6.57088529530803 46.5960105062694 0.0137585168704391, 6.5711598137167 46.5957651730409 0.0143869826570153, 6.57150723600241 46.5951961462648 0.0149880116805434, 6.57156983684606 46.5948893284587 0.0149431088939309, 6.57160921611252 46.5943825708146 0.0149295087903738, 6.57161075242528 46.5942124738253 0.0149738546460867, 6.57158897888103 46.5940430353428 0.014948345720768, 6.57156787128639 46.5939364239276 0.0149213811382651, 6.5714625597638 46.5936204801321 0.0147477742284536, 6.57127671677416 46.5933226950154 0.0143270064145327, 6.57099157252526 46.5929598607935 0.013805203139782, 6.57065747681151 46.5926293938491 0.0132789956405759, 6.57022511220604 46.5923584498758 0.012418320402503, 6.56967085944024 46.5920824260455 0.0114484475925565, 6.56961600245632 46.5920558390323 0.0113725271075964, 6.56956017221741 46.5920302321058 0.0112928161397576, 6.56852487415021 46.5915684932987 0.0104926703497767))
 *                       ReconstructionAreaWkt: POLYGON Z ((6.56852487415021 46.5915684932987 0.0104926703497767, 6.5680336826834 46.5913970951883 0.0103219719603658, 6.56695133044283 46.5912831238015 0.0092630861327052, 6.56640831720097 46.59134562044 0.0084214741364121, 6.56589157496545 46.5914446281431 0.0076501108705997, 6.5655601735243 46.5915250437099 0.0071994801983237, 6.5652474442705 46.5916354141137 0.0066913273185492, 6.56405303339511 46.5921295553694 0.0054675815626979, 6.56375917223675 46.5922709022093 0.0053572561591864, 6.56349616579304 46.5924386621434 0.0051988884806633, 6.56305971572875 46.5927580905968 0.0050631212070584, 6.56277439493727 46.5930078778067 0.0050623929128051, 6.56241523127163 46.5935908528052 0.0048407837748528, 6.56237138369332 46.5942235046339 0.0043535362929106, 6.56247098329051 46.5945339310851 0.0040284255519509, 6.56286729232687 46.5953982357811 0.0038361875340343, 6.56309687529703 46.5957570830402 0.004065066576004, 6.56386207749858 46.5963312955334 0.0042940583080053, 6.56436134335269 46.5965193788969 0.0042827343568206, 6.56669786198042 46.5971831733814 0.0069808261469007, 6.5674236912121 46.5973093381441 0.0085588721558452, 6.56817162791066 46.5972883045054 0.0098582990467548, 6.5685366802536 46.5972412981384 0.0104763153940439, 6.56894107551418 46.5971656377406 0.0111821535974741, 6.56967170390951 46.5968864883598 0.0121617615222931, 6.56997909782021 46.5966901974147 0.0124103827401996, 6.57088529530803 46.5960105062694 0.0137585168704391, 6.5711598137167 46.5957651730409 0.0143869826570153, 6.57150723600241 46.5951961462648 0.0149880116805434, 6.57156983684606 46.5948893284587 0.0149431088939309, 6.57160921611252 46.5943825708146 0.0149295087903738, 6.57161075242528 46.5942124738253 0.0149738546460867, 6.57158897888103 46.5940430353428 0.014948345720768, 6.57156787128639 46.5939364239276 0.0149213811382651, 6.5714625597638 46.5936204801321 0.0147477742284536, 6.57127671677416 46.5933226950154 0.0143270064145327, 6.57099157252526 46.5929598607935 0.013805203139782, 6.57065747681151 46.5926293938491 0.0132789956405759, 6.57022511220604 46.5923584498758 0.012418320402503, 6.56967085944024 46.5920824260455 0.0114484475925565, 6.56961600245632 46.5920558390323 0.0113725271075964, 6.56956017221741 46.5920302321058 0.0112928161397576, 6.56852487415021 46.5915684932987 0.0104926703497767))
 *                       workingFolder: C:/Projects/WorkingFolder
 *                       MaxLocalFusers: 10
 *             AddPauseTask:
 *               summary: Add pause processing task for PhotoMesh type task (Action 4)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Pause project processing
 *                     action: 4
 *             AddProcessErrorTiles:
 *               summary: Add process error tiles task (Action 6)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Process error tiles from previous build
 *                     action: 6
 *                     task_params:
 *                       buildId: Build_2
 *                       retryCount: 3
 *             AddImportCSV:
 *               summary: Add CSV import task (Action 7)
 *               value:
 *                 projectKey: project-jkl-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Import data from a CSV file
 *                     action: 7
 *                     task_params:
 *                       jsonAPI:
 *                         filePath: C:/Users/Administrator/Downloads/img/data/images.csv
 *                         headers:
 *                           ImagePath: "#1"
 *                           X: "#2"
 *                           Y: "#3"
 *                           Altitude: "#4"
 *                           Yaw: 5
 *                           Pitch: 6
 *                           Roll: 7
 *                         dataAtRow: 1
 *                         headersAtRow: 0
 *                         dataSeparator: ","
 *                         headerSeparator: ","
 *                         selectedFolderPath: C:/Users/Administrator/Downloads/img
 *                         searchSubFolder: true
 *             AddImportGCP:
 *               summary: Add GCP import task (Action 8)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Import ground control point data
 *                     action: 8
 *                     task_params:
 *                       jsonAPI:
 *                         filePath: C:/Users/Administrator/GCPfiles/control_points.txt
 *                         headersAtRow: 1
 *                         dataAtRow: 2
 *                         headerSeparator: " "
 *                         dataSeparator: " "
 *                         headers:
 *                           Name: "#4"
 *                           X: "#1"
 *                           Y: "#2"
 *                           Altitude: "#3"
 *                         coordinateSystem: WGS84
 *                         pointType: 1
 *                         haveNoHeaders: false
 *             AddLoadGCP:
 *               summary: Add load GCP task (Action 10)
 *               value:
 *                 projectKey: project-pqr-789
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Load ground control point data
 *                     action: 10
 *                     task_params:
 *                       gcpPath: C:/Users/Administrator/Projects/SiteMap/control_points.gcp
 *             AddLoadPhotos:
 *               summary: Add load photos task (Action 11)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Load photo data from files
 *                     action: 11
 *                     task_params:
 *                       sourceType: 2
 *                       sourcePath:
 *                         - name: Drone Flight 1
 *                           path: C:/MyProject/Photos/DroneImages.xlsx
 *                           properties: ""
 *                         - name: Ground Photos
 *                           path: C:/MyProject/Photos/GroundImages.xlsx
 *                           properties: ""
 *             AddOpenExistingProject:
 *               summary: Add open existing project task (Action 12)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: PhotoMesh
 *                     comment: Open Existing Project
 *                     action: 12
 *                     task_params:
 *                       projectPath: C:/MyProject/Projects/New1Project.PhotoMeshXML
 *             AddRunScript:
 *               summary: Add run script task (Action 0)
 *               value:
 *                 projectKey: project-ghi-789
 *                 tasks:
 *                   - type: Queue
 *                     comment: Run a custom script
 *                     action: 0
 *                     task_params:
 *                       path: C:/Scripts/process_model.py
 *             AddPauseTask2:
 *               summary: Add pause processing task for Queue type task (Action 4)
 *               value:
 *                 projectKey: project-abc-123
 *                 tasks:
 *                   - type: Queue
 *                     comment: Pause project processing
 *                     action: 4
 *     responses:
 *       200:
 *         description: Tasks added successfully
 *       400:
 *         description: Invalid request data or project identifier not provided
 *       404:
 *         description: Project not found
 */
router.post('/addTasks', async (req, res) => {
    try {
        const { projectId, projectKey, tasks: taskData } = req.body;
        
        if (!projectId && !projectKey) {
            res.status(400).json({ error: 'Either projectId or projectKey must be provided' });
            return;
        }

        if (!taskData || (!Array.isArray(taskData) && typeof taskData !== 'object')) {
            res.status(400).json({ error: 'Tasks data must be provided as an object or array' });
            return;
        }

        const tasks = Array.isArray(taskData) ? taskData : [taskData];
        const result = await addTasksToProject(projectId, projectKey, tasks);
        sseManager.sendTasksAdded(projectId,projectKey,tasks);
        res.json(result);
    } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(400).json({ error: error instanceof Error ? error.message : "Failed to add tasks to project" });
        }
    }
});

export default router; 