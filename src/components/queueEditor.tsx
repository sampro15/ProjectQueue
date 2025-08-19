//-----------------------------
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Button, TextField, Typography, Card, CardContent, Grid,
//   Box, Container, List, ListItem, ListItemText, IconButton,
//   Tooltip
// } from '@mui/material';
// import DeleteIcon from '@mui/icons-material/Delete';
// import { getApiUrl } from '../config';
// import CopyButton from './CopyButton';

// const QueueEditor = () => {
//   const [projects, setProjects] = useState<any[]>([]);
//   const [newProjectName, setNewProjectName] = useState('');
//   const [globalVars, setGlobalVars] = useState('');
//   const [taskJson, setTaskJson] = useState('');
//   const navigate = useNavigate();

//   const JsonTemplate = [
//     {
//       type: "PhotoMesh",
//       comment: "New project",
//       action: -1,
//       task_params: {
//         projectPath: "C:\\1\\1.PhotoMeshXML"
//       }
//     },
//     {
//       type: "PhotoMesh",
//       comment: "pause",
//       action: 4
//     },
//     {
//       type: "Queue",
//       comment: "run script",
//       action: 0,
//       task_params: {
//         path: "C:\\zip_folder.py"
//       }
//     }
//   ];
//   const JsonVarsTemplayte = { key1: "value1", key2: "value2" };

//   const jsonString = JSON.stringify(JsonTemplate, null, 2);
//   const jsonVarsString = JSON.stringify(JsonVarsTemplayte, null, 2);

//   const isFormValid = newProjectName.trim() !== '' && globalVars.trim() !== '' && taskJson.trim() !== '';

//   const addProject = () => {
//     if (isFormValid) {
//       const newProject = {
//         project_key: newProjectName.trim(),
//         global_vars: JSON.parse(globalVars || '{}'),
//         tasks: JSON.parse(taskJson || '[]'),
//       };
//       setProjects([...projects, newProject]);
//       setNewProjectName('');
//       setGlobalVars('');
//       setTaskJson('');
//     }
//   };

//   const removeProject = (projectKey: string) => {
//     setProjects(projects.filter((project) => project.project_key !== projectKey));
//   };

//   const createJson = () => ({
//     version: '1.0',
//     projects,
//   });

//   const addQueue = async () => {
//     const jsonData = createJson();
//     try {
//       const url = getApiUrl('/queue/addProjects');
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(jsonData),
//       });
//       if (response.ok) {
//         navigate('/manager');
//       } else {
//         console.error('Error sending data to the server');
//       }
//     } catch (error) {
//       console.error('Network error:', error);
//     }
//   };

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const content = e.target?.result as string;
//         const parsedJson = JSON.parse(content);
//         setTaskJson(JSON.stringify(parsedJson, null, 2));
//       } catch (error) {
//         console.error('Invalid JSON file', error);
//       }
//     };
//     reader.readAsText(file);
//   };

//   const handleCopyToClipboard = (jsonStr: string, field: string) => {
//     navigator.clipboard.writeText(jsonStr).then(() => {
//       field === "var" ? setGlobalVars(jsonStr) : setTaskJson(jsonStr);
//     }).catch((error) => {
//       console.error('Failed to copy:', error);
//     });
//   };

//   const insertExampleProject = () => {
//     setNewProjectName("testProject");
//     setGlobalVars(JSON.stringify(JsonVarsTemplayte, null, 2));
//     setTaskJson(JSON.stringify(JsonTemplate, null, 2));
//   };

//   //#region UI

//   return (
//     <Container maxWidth="lg" sx={{ padding: 0, margin: 0 }}>
//       <Box mt={4}>
//         <Card sx={{ mb: 4 }}>
//           <CardContent>
//             <Typography variant="h6">Add a New Project</Typography>
//             <Grid container spacing={3} sx={{ mt: 2 }}>
//               <Grid item xs={12} sm={6}>
//                 <TextField
//                   required
//                   fullWidth
//                   label="New Project Name"
//                   variant="outlined"
//                   value={newProjectName}
//                   onChange={(e) => setNewProjectName(e.target.value)}
//                 />
//               </Grid>

//               <Grid item xs={12} sm={6}>
//                 <Tooltip title="Example: { key1: 'value1', key2: 'value2' }">
//                   <TextField
//                     required
//                     fullWidth
//                     label="Global Vars JSON"
//                     variant="outlined"
//                     multiline
//                     rows={4}
//                     value={globalVars}
//                     onChange={(e) => setGlobalVars(e.target.value)}
//                   />
//                 </Tooltip>
//                 <CopyButton onClick={() => handleCopyToClipboard(jsonVarsString, "var")} />
//               </Grid>

//               <Grid item xs={12}>
//                 <Tooltip title="Example: Array of task objects to run (see docs)">
//                   <TextField
//                     required
//                     fullWidth
//                     label="Array of Tasks []"
//                     variant="outlined"
//                     multiline
//                     value={taskJson}
//                     onChange={(e) => setTaskJson(e.target.value)}
//                     sx={{ '& textarea': { resize: 'vertical', minHeight: 100 } }}
//                   />
//                 </Tooltip>
//                 <CopyButton onClick={() => handleCopyToClipboard(jsonString, "tasks")} />
//               </Grid>

//               <Grid item xs={12}>
//                 <Box display="flex" alignItems="center" gap={2}>
//                   <input
//                     type="file"
//                     accept=".json"
//                     onChange={handleFileUpload}
//                     style={{ marginTop: '10px' }}
//                   />
//                   <Button variant="outlined" color="secondary" onClick={insertExampleProject}>
//                     Example Project
//                   </Button>
//                 </Box>
//               </Grid>

//               <Grid item xs={12}>
//                 <Button
//                   variant="contained"
//                   color="primary"
//                   onClick={addProject}
//                   disabled={!isFormValid}
//                 >
//                   Add Project
//                 </Button>
//               </Grid>
//             </Grid>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent>
//             <Typography variant="h6">Projects List</Typography>
//             {projects.length > 0 ? (
//               <List>
//                 {projects.map((project) => (
//                   <ListItem key={project.project_key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
//                     <ListItemText
//                       primary={`Project Key: ${project.project_key}`}
//                       secondary={`Global Vars: ${JSON.stringify(project.global_vars)}`}
//                     />
//                     <IconButton onClick={() => removeProject(project.project_key)} color="error">
//                       <DeleteIcon />
//                     </IconButton>
//                   </ListItem>
//                 ))}
//               </List>
//             ) : (
//               <Typography variant="body2" color="textSecondary">
//                 No projects added yet.
//               </Typography>
//             )}
//           </CardContent>
//         </Card>

//         <Box mt={4} display="flex" justifyContent="center">
//           <Button
//             variant="contained"
//             color="primary"
//             onClick={addQueue}
//             disabled={projects.length === 0}
//           >
//             Add to Manager
//           </Button>
//         </Box>
//       </Box>
//     </Container>
//   );
// };

// export default QueueEditor;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  Container,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { getApiUrl } from "../config";
import Editor from "@monaco-editor/react";

const QueueEditor = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [editorContent, setEditorContent] = useState("");
  const navigate = useNavigate();

  const JsonTemplate = [
    {
      type: "PhotoMesh",
      comment: "New project",
      action: -1,
      task_params: {
        projectPath: "C:\\1\\1.PhotoMeshXML",
      },
    },
    {
      type: "PhotoMesh",
      comment: "pause",
      action: 4,
    },
  ];

  const JsonVarsTemplate = { key1: "value1", key2: "value2" };

  const exampleContent = JSON.stringify(
    {
      version: "1.0",
      projects: [
        {
          project_key: "testProject",
          global_vars: JsonVarsTemplate,
          tasks: JsonTemplate,
        },
      ],
    },
    null,
    2
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setEditorContent(text);
      }
    };
    reader.readAsText(file);

    // Reset file input so re-upload of same file triggers onChange again
    e.target.value = "";
  };

  const addProject = () => {
    try {
      const parsed = JSON.parse(editorContent);

      // Handle case: single project (old format)
      if (
        typeof parsed.project_key === "string" &&
        typeof parsed.global_vars === "object" &&
        Array.isArray(parsed.tasks)
      ) {
        const trimmedKey = parsed.project_key.trim();
        const newProject = {
          project_key: trimmedKey,
          global_vars: parsed.global_vars,
          tasks: parsed.tasks,
        };

        const updatedProjects = projects.filter(
          (p) => p.project_key !== trimmedKey
        );
        setProjects([...updatedProjects, newProject]);
        setEditorContent("");
        return;
      }

      // Handle case: full format with version + projects array
      if (
        Array.isArray(parsed.projects) &&
        parsed.projects.every(
          (p: any) =>
            typeof p.project_key === "string" &&
            typeof p.global_vars === "object" &&
            Array.isArray(p.tasks)
        )
      ) {
        const mergedProjects = [...projects];

        parsed.projects.forEach((proj: any) => {
          const trimmedKey = proj.project_key.trim();
          const filtered = mergedProjects.filter(
            (p) => p.project_key !== trimmedKey
          );
          mergedProjects.splice(0, mergedProjects.length, ...filtered, proj);
        });

        setProjects(mergedProjects);
        setEditorContent("");
        return;
      }

      // If neither format matches, show error
      alert(
        'Invalid JSON format. Must contain either a single project or a "projects" array.'
      );
    } catch (error) {
      alert("Invalid JSON: " + error);
    }
  };

  const removeProject = (projectKey: string) => {
    setProjects(
      projects.filter((project) => project.project_key !== projectKey)
    );
  };

  const createJson = () => ({
    version: "1.0",
    projects,
  });

  const addQueue = async () => {
    const jsonData = createJson();
    try {
      const url = getApiUrl("/queue/addProjects");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });
      if (response.ok) {
        navigate("/manager");
      } else {
        console.error("Error sending data to the server");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const insertExampleProject = () => {
    setEditorContent(exampleContent);
  };
  const openDocumentation = () => {
    const baseUrl = window.location.origin; // e.g., http://localhost:5173
    const docsUrl = `${baseUrl}/api-docs/#/queue/post_queue_addProjects`;
    window.open(docsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Container maxWidth="lg" sx={{ padding: 0, margin: 0 }}>
      <Box mt={4}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Add a New Project (JSON Input)
            </Typography>

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {/* <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
              />
              <Button variant="outlined" color="primary" onClick={insertExampleProject}>
                Upload File
              </Button> */}
              <input
                accept=".json"
                id="upload-json-file"
                type="file"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              <label htmlFor="upload-json-file">
                <Button variant="outlined" color="primary" component="span">
                  Load Queue JSON File
                </Button>
              </label>
              <Button
                variant="outlined"
                color="primary"
                component="span"
                onClick={insertExampleProject}
              >
                Use Template
              </Button>
              <Button
                variant="outlined"
                color="primary"
                component="span"
                onClick={openDocumentation}
              >
                Open Documentation
              </Button>
            </Box>

            <Editor
              height="400px"
              defaultLanguage="json"
              value={editorContent}
              onChange={(value) => setEditorContent(value || "")}
              options={{ minimap: { enabled: false }, formatOnType: true }}
            />

            <Box display="flex" alignItems="center" gap={2} mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={addProject}
                disabled={!editorContent.trim()}
              >
                Add Project
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Button
              variant="contained"
              color="primary"
              onClick={addQueue}
              disabled={projects.length === 0}
              sx={{ mb: 2 }}
            >
              Add to Queue
            </Button>
            <Typography variant="h6">Projects List</Typography>
            {projects.length > 0 ? (
              <List>
                {projects.map((project) => (
                  <ListItem
                    key={project.project_key}
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <ListItemText
                      primary={`Project Key: ${project.project_key}`}
                      secondary={`Global Vars: ${JSON.stringify(
                        project.global_vars
                      )}`}
                    />
                    <IconButton
                      onClick={() => removeProject(project.project_key)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No projects added yet.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Box mt={4} display="flex" justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            onClick={addQueue}
            disabled={projects.length === 0}
          >
            Add to Queue
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default QueueEditor;
