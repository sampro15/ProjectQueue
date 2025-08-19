import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { getApiUrl } from "../config";

type Project = {
  project_key: string;
  id: string;
  global_vars: Record<string, string>;
};

const VariablesEditPage: React.FC<{ projId?: number | null }> = ({ projId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [jsonData, setJsonData] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchProjects() {
      try {
        const url = getApiUrl('/queue/getqueue');
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data: any = await response.json();
        const parsedProjects: Project[] = data.projects.map((proj: any) => ({
          id: proj.id,
          project_key: proj.project_key,
          global_vars: proj.global_vars || {},
        }));
        setProjects(parsedProjects);
        if (projId) {
          setSelectedProjectId(projId.toString());
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const selectedProject = projects.find(
        (project) => Number(project.id) === Number(selectedProjectId)
      );
      if (selectedProject) {
        setJsonData(selectedProject.global_vars || {});
      }
    }
  }, [selectedProjectId, projects]);

  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find((project) => project.id === projectId);
    if (selectedProject) {
      setSelectedProjectId(projectId);
      setJsonData(selectedProject.global_vars || {});
    }
  };

  const handleChange = (key: string, newValue: string) => {
    setJsonData((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleAddKeyValue = () => {
    setJsonData((prev) => ({ ...prev, [`key${Object.keys(prev).length}`]: "" }));
  };

  const renameKey = (oldKey: string, newKey: string) => {
    setJsonData((prev) => {
      if (newKey.trim() === "" || prev[newKey]) return prev;
      const updated = { ...prev };
      updated[newKey] = updated[oldKey];
      delete updated[oldKey];
      return updated;
    });
  };

  const saveChanges = async () => {
    try {
      const payload = { projectId: selectedProjectId, globalVars: jsonData };
      const url = getApiUrl('/project/setGlobalVars');
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save changes");
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes");
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Project</InputLabel>
          <Select
            value={selectedProjectId}
            label="Select Project"
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.project_key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          flexGrow: 1,
          maxHeight: 'calc(100vh - 250px)',
          '& .MuiTableCell-root': {
            py: 1,
            px: 2,
          }
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="40%"><b>Key</b></TableCell>
              <TableCell width="60%"><b>Value</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(jsonData).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell>
                  <TextField
                    value={key}
                    onChange={(e) => renameKey(key, e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <IconButton 
          onClick={handleAddKeyValue}
          sx={{ 
            backgroundColor: '#F7F8FC',
            '&:hover': { backgroundColor: '#E5EDF8' }
          }}
        >
          <AddIcon />
        </IconButton>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={saveChanges}
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default VariablesEditPage;
