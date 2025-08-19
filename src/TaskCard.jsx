// import React from 'react';
// import { Card, CardContent, Typography, CardActions, Button, IconButton, Grid } from '@mui/material';
// import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
// import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
// import DeleteIcon from '@mui/icons-material/Delete';

// const ProjectCard = ({ project, index, refreshQueue }) => {
  // const handleRemove = async () => {
  //   await fetch(`/project/remove?index=${index}`);
  //   refreshQueue();
  // };

  // const handleMove = async (direction) => {
  //   await fetch(`/project/move?index=${index}&direction=${direction}`);
  //   refreshQueue();
  // };

//   return (
//     <Card variant="outlined" sx={{ minWidth: 275 }}>
//       <CardContent>
//         <Typography variant="h6" gutterBottom>Project {index + 1}</Typography>
//         <Typography variant="body2" color="textSecondary">Name: {project.comment}</Typography>
//         <Typography variant="body2" color="textSecondary">Action: {project.action}</Typography>
//         {project.projectPath && <Typography variant="body2">Path: {project.projectPath}</Typography>}
//         {/* Add more details as needed */}
//       </CardContent>
//       <CardActions>
//         <Button variant="contained" color="error" onClick={handleRemove} startIcon={<DeleteIcon />}>
//           Remove
//         </Button>
//         <IconButton onClick={() => handleMove(-1)} color="primary">
//           <ArrowUpwardIcon />
//         </IconButton>
//         <IconButton onClick={() => handleMove(1)} color="primary">
//           <ArrowDownwardIcon />
//         </IconButton>
//       </CardActions>
//     </Card>
//   );
// };

// export default ProjectCard;

// import React from "react";
// import { Card, CardContent, Typography, Button } from "@mui/material";

// const baseURL = "http://localhost:8087/ProjectQueue/";

// const eBuildActions = {
//   createNewProject: 0,
//   newBuildVersion: 1,
//   newBuildVersionCopyAT: 2,
//   build: 3,
//   pause: 4,
//   script: 5,
//   buildErrorTiles: 6
// }

// function moveProject(from,direction) {
//   $.get(baseURL + "project/move?from="+from+"&to="+(from+direction), function (data) {
//   }).fail(function (err) {
//       alert(err.responseText);
//   });    
// }

// const handleRemove = async () => {
//   await fetch(baseURL + `/project/remove?index=${index}`);
//   refreshQueue();
// };

// const handleMove = async (from,direction) => {
//   await fetch( `${baseURL}project/move?from=${from}&to=${direction}`);
//   //refreshQueue();
//   //window.location.reload(); // This will refresh the page (F5 equivalent)
// };

// function ProjectCard({ project, index, onRemove }) {
//   return (
//     <Card variant="outlined" sx={{ marginBottom: 2 }}>
//       <CardContent>
//         <Typography variant="h6">
//           <b>{index + 1}. Project Name:</b> {project.comment}
//         </Typography>
//         <Typography variant="body2">
//           <b>Path:</b> {project.projectPath} {/* Add other project properties here */}
//           <b>Action:</b> {project.action}
//         </Typography>
//         <Button size="small" color="error" onClick={onRemove}>
//           Remove
//         </Button>
//         <Button size="small" onClick={() => {handleMove(index,index-1)/* Move up function */}}>
//           Move Up
//         </Button>
//         <Button size="small" onClick={() => {handleMove(index,index+1)/* Move down function */}}>
//           Move Down
//         </Button>
//       </CardContent>
//     </Card>
//   );
// }

// export default ProjectCard;

import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { actionNames } from './enums'; // Import the reverse lookup

const baseURL = "http://localhost:8090/ProjectQueue/";

const handleMove = async (from, to) => {
  try {
    await fetch(`${baseURL}project/move?from=${from}&to=${to}`);
  } catch (err) {
    alert(`Error moving project: ${err}`);
  }
};



function ProjectCard({ project, index, projectKey, tasksLength, onRemove, onMoveUp, onMoveDown }) {
  return (
    <Card variant="outlined" sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6">
          <b>{index + 1}. Task Name:</b> {project.comment} (Key: {projectKey})
        </Typography>
        <Typography variant="body2">
          <b>Path:</b> {project.projectPath} <br />
          <b>Action:</b> {actionNames[project.action]}
        </Typography>
        <Button size="small" color="error" onClick={onRemove}>
          Remove Task
        </Button>
        <Button size="small" onClick={onMoveUp} disabled={index === 0}>
          Move Up
        </Button>
        <Button size="small" onClick={onMoveDown} disabled={index === tasksLength - 1}>
          Move Down
        </Button>
      </CardContent>
    </Card>
  );
}



// function ProjectCard({ project, index, projectKey, onRemove }) {
//   return (
//     <Card variant="outlined" sx={{ marginBottom: 2 }}>
//       <CardContent>
//         <Typography variant="h6">
//           <b>{index + 1}. Project Name:</b> {project.comment} (Key: {projectKey})
//         </Typography>
//         <Typography variant="body2">
//           <b>Path:</b> {project.projectPath} <br />
//           <b>Action:</b> {project.action}
//         </Typography>
//         <Button size="small" color="error" onClick={onRemove}>
//           Remove
//         </Button>
//         <Button size="small" onClick={() => handleMove(index, index - 1)}>
//           Move Up
//         </Button>
//         <Button size="small" onClick={() => handleMove(index, index + 1)}>
//           Move Down
//         </Button>
//       </CardContent>
//     </Card>
//   );
// }

// function ProjectCard({ project, index, projectKey, onRemove }) {
//   return (
//     <Card variant="outlined" sx={{ marginBottom: 2 }}>
//       <CardContent>
//         <Typography variant="h6">
//           <b>{index + 1}. Project Name:</b> {project.comment}
//         </Typography>
//         <Typography variant="body2">
//           <b>Path:</b> {project.projectPath}
//           <b>Action:</b> {project.action}
//         </Typography>
//         <Button size="small" color="error" onClick={onRemove}>
//           Remove
//         </Button>
//         <Button size="small" onClick={() => handleMove(index, index - 1)}>
//           Move Up
//         </Button>
//         <Button size="small" onClick={() => handleMove(index, index + 1)}>
//           Move Down
//         </Button>
//       </CardContent>
//     </Card>
//   );
// }

export default ProjectCard;
