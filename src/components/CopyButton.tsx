import React from 'react';
import { IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface CopyButtonProps {
  onClick: () => void;
  icon?: React.ElementType; // Allows any Material UI icon or custom icon
}

const CopyButton: React.FC<CopyButtonProps> = ({ onClick, icon: Icon = ContentCopyIcon }) => {
  return (
    <IconButton
      onClick={onClick}
      sx={{
        backgroundColor: 'white',
        width: 30,  // Set fixed width
        height: 30, // Set fixed height (square)
        padding: 0, // Remove default padding to make it square
        borderRadius: 2, // Optional: Use a small border radius if you want slightly rounded corners
        boxShadow: 1, // Optional: Add a subtle shadow for better visibility
        '&:hover': {
          backgroundColor: '#f0f0f0', // Light hover effect
        },
      }}
    >
      <Icon />
    </IconButton>
  );
};

export default CopyButton;
