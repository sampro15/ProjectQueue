import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogActions, DialogContent, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { queueActionNames, photoMeshActionNames } from '../types/enums';
import VariablesEditPage from './VariablesEditPage';
import { keyframes } from '@mui/system';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getApiUrl } from '../config';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

import { useNavigate } from 'react-router-dom';

export type Task = {
  id: number;
  project_id: number;
  guid: string;
  type: string;
  comment?: string;
  action: number;
  task_json: any;
  next_task_guid?: string;
  custom_condition?: string;
  is_active: boolean;
  status: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
};



const VariableEditPage: React.FC<{ projId: number }> = ({ projId }) => {
  return (
    <div>
      {/* <Typography variant="h6">Editing Variables for Project ID: {projId}</Typography> */}
      {<VariablesEditPage projId={projId}/>}
    </div>
  );
};

//#region Summery
export const Summary: React.FC<{ 
  projectStatus: string;
  queueStatus: string;
  projectID: number;
  tasks: Task[];
  onMove: (projId: number, moveTo: string) => Promise<void>;
}> = ({ projectStatus,queueStatus, projectID, tasks, onMove }) => {

  //#region for pause/unpause queue
  const [queuePaused,setQueuePaused ]= useState(queueStatus === 'paused'? true : false);

  useEffect(() => {
    // const intervalId = setInterval(() => {  
      setQueuePaused(queueStatus === 'paused'? true : false);
    // }, 1000)
    // return () => clearInterval(intervalId); 
  }, [queueStatus]);

  // useEffect(() => {
  //     setQueuePaused(queueStatus === 'paused'? true : false);
  // }, [queueStatus]);  

  const handlePauseResume = async () => {
    const endpoint = queuePaused
      ? "/queue/unpause"
      : "/queue/pause";
      const url = getApiUrl(endpoint);

      setQueuePaused(!queuePaused);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    const { success } = result;

    if (success) {
      if (queuePaused) {
        console.log("Queue Resumed");
        setQueuePaused(false);
      } else {
        console.log("Queue Paused");
        setQueuePaused(true);
      }
    }
  };

  
  //#region for Remove Dialog
  const [open, setOpen] = useState(false);
  const [selectedProjId, setSelectedProjId] = useState<number | null>(null);

  const handleOpenRemoveDialog = (projId: number) => {
    setSelectedProjId(projId);
    setOpen(true);
  };
  const handleRemoveProject = async () => {
    if (selectedProjId === null) return;

    handleCloseRemoveDialog();
    try {
      const url = getApiUrl(`/project/remove`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: selectedProjId }),
      });

      const result = await response.json();
      console.log("Response:", result);

      // Close dialog after success
       handleCloseRemoveDialog();
    } catch (error) {
      console.error("Error removing project:", error);
    }
    
  };

  const handleCloseRemoveDialog = (): void => {
    setOpen(false);
    setSelectedProjId(null);
  };


//#region For Global VArs Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
const handleOpenDialog = (): void => {
  //setSelectedTaskId(taskId);
  setIsDialogOpen(true);
};

const handleCloseDialog = (): void => {
  setIsDialogOpen(false);
  //setSelectedTaskId(null);
};

// //#region move project up/down 
// const moveProject = async(projId1:number, moveTo:string): Promise<void> =>{

//   const projId2 = moveTo == "up"? projId1 -1: projId1 +1;

//   try {
//     const url = getApiUrl('/project/switch');
//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//        body: JSON.stringify({ projectId1: projId1 ,projectId2 : projId2}), // Send the body with the projectId
//     });

//     if (!response.ok) {
//       console.error("Failed to move project");
//       return;
//     }
//     const data = await response.json();
  
//   } catch (error) {
//     console.error("Error movving project:", error);
//   } finally {
   
//   }
// }

  if (!Array.isArray(tasks)) {
    return <div>Error: Invalid tasks data</div>;
  }

  // const activeTasks = tasks.filter((task) => task.is_active).length;


  const handleAbortProject = async() => {
    const url = getApiUrl(`/queue/abort`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      }
    });
    const result = await response.json();
    const { success } = result;
    if(success){
      console.log("Queue Aborted");
    }
    
  };
 

  const blink = keyframes`
  50% {
    opacity: 0.5;
  }
`;

  return (
    <>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 2, backgroundColor: '#f9f9f9' }}>
    <Typography variant="body1" sx={{ mr: 2 }}>
      Total Tasks: <strong>{tasks.length}</strong>
    </Typography>
    {/* <Typography variant="body1" sx={{ mx: 2 }}>
      | Active Tasks: <strong>{activeTasks}</strong>
    </Typography> */}
    <Typography variant="body1" sx={{ mx: 2 }}>
      | Project ID: <strong>{projectID}</strong>
    </Typography>
    <Typography variant="body1" sx={{ mx: 2 }}>
      | Status: <strong>{projectStatus}</strong>
      {projectStatus==="completed"?  <CheckCircleIcon sx={{ fontSize: 20, ml: 1, color: 'green', transform: 'translateY(4px)' }} />:""}
     
    </Typography>

       {projectStatus === 'running' && (
        <>
               {queuePaused &&(
              <Button  variant="contained" color="primary"          
               sx={{
                ml: 1,
                animation: `${blink} 1.5s infinite`,
               
              minWidth: '100px', // Matches the width of the Resume button
              }} 
              onClick={handlePauseResume}>
              Resume
              </Button>
              )}
              {!queuePaused &&(
                  <Button variant="outlined" color="primary" 
                  sx={{
                    ml: 2, // Adds spacing between the buttons
                    minWidth: '100px', // Matches the width of the Resume button
                  }}
                  onClick={handlePauseResume}>
                   Pause
                 </Button>
              )}


          <Button
            // disabled={queuePaused} // Disable the button when queuePaused is true
            onClick={handleAbortProject} // Action to abort the project
            variant="outlined"
            color="error"
            sx={{
              ml: 2, // Adds spacing between the buttons
              minWidth: '100px', // Matches the width of the Resume button
            }}
          >
            Abort
          </Button>
        </>
      )}
      <Button
        variant="contained"
        color="error"
        sx={{ marginLeft: 'auto' }}
        onClick={() => handleOpenRemoveDialog(projectID)}
        disabled={projectStatus === 'completed' || projectStatus === 'running'}
      >
        Remove
      </Button>
      <Button
        size="small"
        onClick={() => onMove(projectID, 'up')}
        disabled={projectStatus !== 'pending'}
      >
        {/* Move Up */}
        < ArrowUpwardIcon />
      </Button>
      <Button
        size="small"
        onClick={() => onMove(projectID, 'down')}
        disabled={projectStatus !== 'pending'}
      >
        {/* Move Down */}
       < ArrowDownwardIcon />
              </Button>
      <Button
        variant="contained"
        onClick={() => handleOpenDialog()} // Pass the task ID dynamically here
      >
        Global Vars
      </Button>
    </Box>


  {/*  Global Variables Dialog  */ }
  <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        {/* <DialogTitle>Global Variables</DialogTitle> */}
        <DialogContent>
          { <VariableEditPage projId={projectID} />}
          {      
          // <Button size="small" onClick={handleCloseDialog}>
          // Close
          // </Button>
          <Button variant="outlined" size="small"  onClick={handleCloseDialog} >Close</Button>
          }
        </DialogContent>
      </Dialog>

     {/* Confirmation Dialog */}
      <Dialog open={open} onClose={handleCloseRemoveDialog}>
        <DialogTitle>Confirm Project Removal</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove this project?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveDialog} color="primary" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleRemoveProject} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
  </>
  );
};


//#region TaskTable
const TasksTable: React.FC<{ 
  projectId:number,
  tasks: Task[]; 
  // columns: GridColDef[]; 
  projStatus: string;
  queueStatus: string;
  onReRun: () => void;
}> = ({ projectId, tasks, projStatus, queueStatus, onReRun }) => {
  const navigate = useNavigate();

  const handleReRunClick = async (taskId: number|undefined): Promise<void> => {
    try {
      const url = getApiUrl('/queue/rerun');
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({projectId, taskId }),
      });
      
      onReRun();
      navigate('/manager');
      
      const result = await response.json();
      console.log("Response:", result);
    } catch (error) {
      console.error("Error sending task error:", error);
    }
  };

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    id: 70,
    comment: 250,
    type: 100,
    actionName: 150,
    status: 120,
    started_at: 200,
    completed_at: 200
  });
  
  const handleColumnResize = (params: any) => {
    setColumnWidths((prev) => ({
      ...prev,
      [params.colDef.field]: params.width,
    }));
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', sortable:false , width: columnWidths.id},
    { field: 'comment', headerName: 'Comment', sortable:false , width: columnWidths.comment },
    { field: 'type', headerName: 'Type', sortable:false , width: columnWidths.type },
    { field: 'actionName', headerName: 'Action', sortable:false , width: columnWidths.actionName }, // Use the derived field
    { field: 'status', headerName: 'Status', sortable:false , width: columnWidths.status },
    { field: 'started_at', headerName: 'Started At', sortable:false , width: columnWidths.started_at},
    { field: 'completed_at', headerName: 'Completed At', sortable:false , width: columnWidths.completed_at },
  ];

  const updatedColumns: GridColDef[] = columns.map((column) => {
  
    if (column.field === 'status') {
      // Modify the 'status' column to include the icon in the renderCell
      return {
        ...column,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'left', justifyContent: 'left' ,paddingTop:'15px'}}>
            <Typography variant="body2" sx={{ flexGrow: 1, textAlign: 'left' }}>{params.value}</Typography>
            {(projStatus === 'failed' || projStatus==='aborted') && params.value != 'pending' && (
              <Tooltip title="Click to ReRun from here">
                <MoveUpIcon
                  sx={{ ml: 1, cursor: 'pointer', color: 'red' }}
                  onClick={() => handleReRunClick(params.row.id)} // Handle the click event
                />
              </Tooltip>
            )}
            {
              (projStatus === 'running') && params.value === 'running' && (
              <CircularProgress size={20} sx={{ml: 1}} />
              )
            }
                        {
              (projStatus === 'running' || projStatus==='completed') && params.value === 'completed' && (
              <CheckCircleIcon  sx={{size:20 ,ml: 1,color:'green'}} />
              )
            }
          </Box>
        ),
      };
    }
    return column;
  });
 
 

  return (
    <DataGrid
      rows={tasks.map((task) => ({
        ...task,
        type: task.type,
        next_task: task.next_task_guid || 'N/A',
        active: task.is_active ? 'Yes' : 'No',
        actionName: task.type === 'Queue' 
        ? queueActionNames[task.action] || 'Unknown'
        : photoMeshActionNames[task.action] || 'Unknown', // Map action number to its name based on type
        
      }))}
      columns={updatedColumns}
      onColumnResize={ handleColumnResize}
      getRowClassName={(params) =>{
        // params.row.status == "running" ? "running-row" : ""
        const isRunningRow = params.row.status === "running";
        const isPausedRow = queueStatus === "paused" && params.row.actionName === "pause";
        return isRunningRow || isPausedRow ? "running-row" : "";
      }}
      sx={{
        "& .running-row": {
          fontWeight: "bold",
          // backgroundColor: "lightskyblue",
          "&:hover": {
            backgroundColor: "#e0e0e0",
          },
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          fontWeight: 700, // Adjust font weight (not fully bold but stronger than normal text)
        },
      }}
      
      hideFooter={true}
      autoHeight
      disableColumnMenu = {true}
      disableRowSelectionOnClick = {true}
    />
  );
};

//#region ProjectCard

export const Project: React.FC<{
  projStatus: string;
  projectID: number;
  projectName: string;
  data: any;
  queueStatus: string;
  onMove: (projId: number, moveTo: string) => Promise<void>;
  onReRun: () => void;
}> = ({ projStatus, projectID, projectName, data, queueStatus, onMove, onReRun }) => {
  // Extract tasks from the project (adjusting the data structure as needed)
  const tasks = data?.tasks || [];



  if (!Array.isArray(tasks)) {
    return <div>Error: Invalid tasks data</div>;
  }
  


  return (
    <Box
    sx={{
      mb: 4,
      mr:2,
      p: 2,
       border: 2,
       borderColor: projStatus === "running" ? "primary.main" : "grey.400",
      // backgroundColor: projStatus === "running" ? "lightGray" : "grey.100",
      boxShadow: projStatus === "running" ? 4 : 1,
      borderRadius: 2, 
      transition: "all 0.3s ease-in-out",
      background:'white'
    }}
  >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Project: {projectName}
      </Typography>
      <Summary 
        projectID={projectID} 
        tasks={tasks} 
        projectStatus={projStatus}
        onMove={onMove}
        queueStatus={queueStatus}
      />
      <TasksTable 
        projectId={projectID} 
        tasks={tasks} 
        // columns={columns} 
        projStatus={projStatus} 
        queueStatus={queueStatus}
        onReRun={onReRun}
      />
    </Box>
  );
};
