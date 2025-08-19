import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { actionNames } from './enums'; // Import the reverse lookup
import './styles.css'; // Import the CSS file

const baseURL = "http://localhost:8090/ProjectQueue/";

const handleStartBuild = async () => {
  await fetch(baseURL + "build/start");
  // fetchCurrentProject(); // Refresh current project status
};

const resumeCurrent = async () => {
  await handleStartBuild();
};

function ProjectCard({ task }) {
  // Blinking button style using CSS-in-JS
  const blinkingButtonStyle = {
    animation: 'blink 1s step-start 0s infinite',
    backgroundColor: '#f44336', // Red color for the button
    color: 'white',
    '&:hover': {
      backgroundColor: '#d32f2f', // Darker red on hover
    }
  };

  return (
    <Card variant="outlined" sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="body2">
          <b>Task Name: </b>{task.comment} (Key: {task.projectKey})
        </Typography>
        <Typography variant="body2">
          Path: {task.projectPath} <br />
          Action: {actionNames[task.action]}
        </Typography>

        {/* Render blinking button only if task.action === 4 (pause) */}
        {task.action === 4 && (
          <Button
            sx={blinkingButtonStyle}
            onClick={resumeCurrent}
          >
            Resume Build
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectCard;

// CSS for blinking animation (could also be moved to a global CSS file)
const styles = {
  '@keyframes blink': {
    '0%': {
      opacity: 0.5
    },
    '50%': {
      opacity: 1
    },
    '100%': {
      opacity: 0.5
    }
  }
};
