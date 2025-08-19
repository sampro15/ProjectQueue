import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  Divider,
  Paper,
} from "@mui/material";

//mui icons
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';

import TaskCard from './TaskCard'; // Import the TaskCard component
import CurrentTaskCard from './CurrentTaskCard'; // Import the CurrentTaskCard component
import { actionNames } from './enums'; // Import the reverse lookup
import DOMPurify from 'dompurify'; // Import dompurify

function ProjectQueueManager() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [machineStatus, setMachineStatus] = useState();

  
  const [log, setLog] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [queue, setQueue] = useState([]); // Initialize with an empty array


  const baseURL = "http://localhost:8087/ProjectQueue/";

  //#region Fetch functions
  const fetchProjects = async () => {
    try {
      const response = await fetch(baseURL + "project/getQueue");
      const data = await response.json();
      setQueue(data);
      // Group projects by projectKey
      const groupedProjects = data.reduce((acc, project) => {
        const key = project.projectKey;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(project);
        return acc;
      }, {});
      setProjects(groupedProjects);
     
      // console.log("projects: ", projects);
      // console.log("projects: ",  Object.keys(projects).length);
    } catch (error) {
      console.error("Error fetching project queue:", error);
    }
  };

  const fetchCurrentProject = async () => {
    try {
      const response = await fetch(baseURL + "project/getCurrent");
      const data = await response.json();
      setCurrentProject(data);
    } catch (error) {
      console.error("Error fetching current project:", error);
    }
  };

  const fetchLogStatus = async () => {
    try {
      const response = await fetch(baseURL + "build/getLog");
      const data = await response.text();
      setLog(data);
    } catch (error) {
      console.error("Error fetching log status:", error);
    }
  };

  const fetchIsAliveStatus = async () => {
    try {
      const response = await fetch(baseURL + "manager/getStatus");
      if (!response.ok) {
        console.error(`Machine not response`);
        setIsOnline(false);
        return;
      }
      const data = await response.json();
      setMachineStatus(data);
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
      console.error("Error checking manager status:", error);
    }
  };
//#endregion

  //#region  Handle
  const handleRemoveProject = async (task) => {
    const taskIndex = queue.findIndex((t) => t.comment === task.comment);  // or any other unique field

    await fetch(baseURL + `project/remove?index=${taskIndex}`);
    fetchProjects(); // Refresh project list
  };

  const handleStartBuild = async () => {
    await fetch(baseURL + "build/start");
    fetchCurrentProject(); // Refresh current project status
  };

  const resumeCurrent = async () => {
    await handleStartBuild();
  }
  const handleAbortBuild = async () => {
    if (window.confirm("Are you sure you want to abort the current project?")) {
      await fetch(baseURL + "build/abort");
    }
  };


  const handleRemoveGroup = async (projectKey) => {
    try {
      // Find all task indexes in the queue belonging to the specified projectKey
      const taskIndexes = queue
        .map((task, index) => (task.projectKey === projectKey ? index : null)) // Map to indexes or null if not matching
        .filter((index) => index !== null) // Remove null values
        .reverse(); // Reverse to remove from the end
  
      // Remove each task starting from the last to prevent index shifting
      for (const index of taskIndexes) {
        await fetch(`${baseURL}project/remove?index=${index}`); // Remove via API call
      }
  
      // Remove the group from the projects state
      setProjects((prevProjects) => {
        const updatedProjects = { ...prevProjects };
        delete updatedProjects[projectKey];
        return updatedProjects;
      });
  
      alert(`Successfully removed group: ${projectKey}`);
    } catch (err) {
      console.error(`Error removing group ${projectKey}:`, err);
      alert(`Error removing group: ${err.message}`);
    }
  };
  
  
    
  const toggleGroupCollapse = (projectKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [projectKey]: !prev[projectKey],
    }));
  };

  const handleMove = async (from, to) => {
    try {
      await fetch(`${baseURL}project/move?from=${from}&to=${to}`);
    } catch (err) {
      alert(`Error moving project: ${err}`);
    }
  };
  
  const handleMoveTask = async (task, direction) => {
    console.log("Task object:", task);  // Log the task to check its structure
    console.log("Queue before move:", queue);  // Log the queue to see its structure
  
    const taskIndex = queue.findIndex((t) => t.comment === task.comment);  // or any other unique field
  
    if (taskIndex === -1) {
      console.error("Task not found in queue");
      return; // Exit if task is not found
    }
  
    const targetIndex = taskIndex + direction;
  
    if (targetIndex >= 0 && targetIndex < queue.length) {
      await handleMove(taskIndex, targetIndex);
    } else {
      console.log("Move out of bounds");
    }
  };
  

  const handleMoveGroup = async (projectKey, direction) => {
    console.log(`Moving group for projectKey ${projectKey} in direction: ${direction}`);
  
    // Step 1: Identify the group's start and end indices in the current queue
    const groupItems = queue.filter(item => item.projectKey === projectKey);
    if (groupItems.length === 0) {
      console.error("No tasks found for the given project key.");
      return;
    }
  
    const groupStartIndex = queue.findIndex(item => item.projectKey === projectKey);
    const groupEndIndex = groupStartIndex + groupItems.length - 1;
  
    console.log("Group Start Index:", groupStartIndex);
    console.log("Group End Index:", groupEndIndex);
  
    // Step 2: Calculate target start index for the group
    let targetStartIndex;
    if (direction === "down" && groupEndIndex < queue.length - 1) {
      // Move the group down to the end of the queue
      targetStartIndex = queue.length - groupItems.length;
    } else if (direction === "up" && groupStartIndex > 0) {
      // Move the group up to the beginning of the queue
      targetStartIndex = 0;
    } else {
      console.warn("Move not possible; group is already at the edge.");
      return;
    }
  
    console.log("Target Start Index:", targetStartIndex);
  
    // Step 3: Sequentially move each task in the group
    try {
      for (let i = 0; i < groupItems.length; i++) {
        const fromIndex = groupStartIndex + i;
        const toIndex = targetStartIndex + i;
  
        console.log(`Moving task from index ${fromIndex} to ${toIndex}`);
      }
  
      // Step 4: Update the local state to reflect the final queue
      const updatedQueue = [...queue];
      const removedGroup = updatedQueue.splice(groupStartIndex, groupItems.length);
      updatedQueue.splice(targetStartIndex, 0, ...removedGroup);
  
      console.log("Final Updated Queue:", updatedQueue);
      await handleRemoveProject(-1);
       setQueue(updatedQueue);
       for (const [index, queueItem] of updatedQueue.entries()) {
        const oneV = `[${JSON.stringify(queueItem)}]`; // Wrap each item as a JSON string
        console.log("Processing item:", oneV);
      
        const apiEndpoint2 = "http://localhost:8087/ProjectQueue/project/add";
      
        try {
          const response = await fetch(apiEndpoint2, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: oneV // Pass the wrapped string to the body
          });
      
          if (!response.ok) {
            console.error(`Failed to process task ${index + 1}. Status: ${response.status}`);
            return;
          }
      
          const result = await response.json();
          console.log(`Task ${index + 1} processed successfully:`, result);
      
        } catch (error) {
          console.error(`Error processing task ${index + 1}:`, error);
        }
      }
      
  
    } catch (error) {
      console.error("Error moving group:", error);
    }
  };
  //#endregion
  
  
  
  // Initial fetch on load
  useEffect(() => {
    const statusUpdateInterval = 1000;
    const intervalId = setInterval(() => {
    fetchProjects();
    fetchCurrentProject();
    fetchLogStatus();
    fetchIsAliveStatus();
  }, statusUpdateInterval);

    return () => clearInterval(intervalId);
  }, [baseURL]);


  //#region UI
  return (
    <Box p={3}>
      <Typography variant="h4" align="center" gutterBottom>
        PhotoMesh Projects Queue - Manager
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="space-between" mt={2}>
        <Button variant="contained" color="primary" onClick={() => window.location.href = 'ProjectsQueueEditor.html'}>
          Back to Editor
        </Button>
        <Typography variant="subtitle1" color={isOnline ? "green" : "red"}>
          {isOnline ? "PhotoMesh is online" : "PhotoMesh is offline"}
        </Typography>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Stack direction="row" spacing={4} alignItems="flex-start">
        {/* Projects Queue Section */}
        <Box width="60%">
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="h6">Projects in Queue - [{Object.keys(projects).length}]</Typography>
            <Typography variant="h6">Tasks in Queue - [{queue.length}]</Typography>
            <Button variant="contained" color="error" onClick={() => handleRemoveProject(-1)} startIcon={<DeleteIcon />}>
              Remove All
            </Button>
          </Stack>

          <Box>
            {Object.entries(projects).map(([projectKey, tasks], groupIndex) => (
              <Box
                key={projectKey}
                mb={4}
                p={2}
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  border: '1px solid grey',
                  boxShadow: 2,
                  position: 'relative',
                }}
              >
                {/* Project Group Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => toggleGroupCollapse(projectKey)}>
                    {collapsedGroups[projectKey] ? <ExpandMoreIcon /> : <ExpandLessIcon />} Project Group {groupIndex + 1} (Key: {projectKey}) - [{tasks.length} tasks]
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" color="error" onClick={() => handleRemoveGroup(projectKey)} startIcon={<DeleteIcon />}>
                      Remove Group
                    </Button>
                    <Button size="small" onClick={() => handleMoveGroup(projectKey, "up")} startIcon={<ArrowDropUpIcon />}>
                      Up
                    </Button>
                    <Button size="small" onClick={() => handleMoveGroup(projectKey, "down")} startIcon={<ArrowDropDownIcon />}>
                      Down
                    </Button>
                  </Stack>
                </Box>

                {/* Task List (Collapsible) */}
                {!collapsedGroups[projectKey] && (
                  <Box mt={2} pl={2} pr={2}>
                    {tasks.map((task, index) => (
                      <TaskCard
                        key={index}
                        project={task}
                        index={index}
                        projectKey={projectKey}
                        tasksLength={tasks.length}
                        onRemove={() => handleRemoveProject(task)}
                        onMoveUp={() => handleMoveTask(task, -1)}
                        onMoveDown={() => handleMoveTask(task, 1)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* PhotoMesh Status Section */}
        <Box flexGrow={1}>

          <Stack direction="row" spacing={2} mb={2}>
            <Button variant="contained" color="success" onClick={handleStartBuild}>
              Build
            </Button>
            <Button variant="contained" color="warning" onClick={handleAbortBuild}>
              Abort and Stop
            </Button>
          </Stack>
          <Typography variant="h6" gutterBottom>
            PhotoMesh Status
          </Typography>
          {isOnline ? (
  <Box p={2} bgcolor="grey.200" borderRadius={1} mb={2}>
    <Typography variant="body2">
      <strong>Manager:</strong> 
      {
        machineStatus?.WorkingFolder 
          ? machineStatus.WorkingFolder.match(/\[Manager=(.*?)\]/)?.[1] || 'Unknown' 
          : 'Unknown'
      }
    </Typography>
    
    <Typography variant="body2">
      <strong>Version:</strong> 
      {
        `${machineStatus?.PhotomeshVersion?.Major || 'N/A'}.${machineStatus?.PhotomeshVersion?.Minor || 'N/A'}.${machineStatus?.PhotomeshVersion?.Build || 'N/A'}.${machineStatus?.PhotomeshVersion?.Revision || 'N/A'}`
      }
    </Typography>
    
    <Typography variant="body2">
      <strong>Project:</strong> 
      {machineStatus?.ProjectPath || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>Build Name:</strong> 
      {machineStatus?.BuildName || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>Mode:</strong> 
      {machineStatus?.BuildStatus || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>Working Folder:</strong> 
      {machineStatus?.WorkingFolder || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>Max AWS Fusers:</strong> 
      {machineStatus?.MaxAWSFusers || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>AWS Build Configuration:</strong> 
      {machineStatus?.AWSBuildConfigurationName || 'Not Available'}
    </Typography>
    
    <Typography variant="body2">
      <strong>Max Pool Fusers:</strong> 
      {machineStatus?.MaxPoolFusers || 'Not Available'}
    </Typography>
    
  </Box>
) : (
  <Typography variant="body2">Loading machine status...</Typography>
)}


          {/* Current Project Box */}
          <Box mt={2} p={2} bgcolor="grey.200" borderRadius={1} boxShadow={1}>
            <Typography variant="body1" fontWeight="bold">Current Running Task: </Typography>
            <Typography variant="body2">
              {currentProject && Object.keys(currentProject).length > 0  ? (
                <>
                 <CurrentTaskCard task={currentProject}  resume={() => resumeCurrent()}/>
                </>
              ) : (
                "No project currently running"
              )}
            </Typography>
          </Box>

          {/* Project Queue Log */}
          <Box mt={3} p={2} bgcolor="grey.100" borderRadius={1} boxShadow={1}>
            <Typography variant="h6">Project Queue Log</Typography>
            <Button variant="contained" color="primary" onClick={() => setLog("")} sx={{ mt: 1, mb: 2 }}>
              Clear Log
            </Button>
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(log),
              }}
              style={{
                whiteSpace: 'pre-wrap', // Wrap text while preserving line breaks
                wordBreak: 'break-word', // Break words that are too long to fit
                maxWidth: '100%', // Prevent the div from exceeding the container's width
                overflowWrap: 'break-word', // Break overly long unspaced text
                overflowX: 'hidden', // Avoid horizontal scrolling
              }}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
//#endregion

}

export default ProjectQueueManager;
