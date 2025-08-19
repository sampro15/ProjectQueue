import React, { useState } from "react";
import {
  Typography,
  Popper,
  CardContent,
} from "@mui/material";


const ManagerDetailsTooltip: React.FC<{ isOnline: boolean; machineStatus: any }> = ({
  isOnline,
  machineStatus,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMouseLeave = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Typography
        variant="subtitle2"
        sx={{
          color: isOnline ? "green" : "red",
          fontWeight: "bold",
          textAlign: "center",
          cursor: "pointer", // Indicate it's hoverable
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isOnline ? "PhotoMesh is Online" : "PhotoMesh is Offline"}
      </Typography>

      <Popper
  open={open}
  anchorEl={anchorEl}
  placement="bottom-start"
  disablePortal={false} // Render outside the parent container
  modifiers={[
    {
      name: "preventOverflow",
      options: {
        boundary: "viewport", // Ensure it doesn't go out of the visible viewport
      },
    },
  ]}
  sx={{
    zIndex: 1500, // Higher than AppBar or other elements
    // maxWidth: 400,
    borderRadius: 2,
    boxShadow: 3,
    backgroundColor: "background.paper",
    p: 1,
  }}
>
  {/* <Card sx={{ width: "100%" }}> */}
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: "bold", textAlign: "center", mb: 1 }}>
        Manager Details
      </Typography>
      <Typography variant="body2">
        <strong>Manager:</strong>{" "}
        {machineStatus?.WorkingFolder?.match(/\[Manager=(.*?)\]/)?.[1]+']' || "Unknown"}
      </Typography>
      <Typography variant="body2">
        <strong>Version:</strong>{" "}
        {`${machineStatus?.PhotomeshVersion?._Major || "N/A"}.${
          machineStatus?.PhotomeshVersion?._Minor || "N/A"
        }.${machineStatus?.PhotomeshVersion?._Build || "0"}.${
          machineStatus?.PhotomeshVersion?._Revision || "N/A"
        }`}
      </Typography>
      <Typography variant="body2">
        <strong>Project:</strong> {machineStatus?.ProjectPath || "Not Available"}
      </Typography>
      <Typography variant="body2">
        <strong>Pool Folder:</strong> {machineStatus?.PoolFolder || "Not Available"}
      </Typography>
      

      <Typography variant="body2">
        <strong>Mode:</strong> {machineStatus?.BuildStatus || "Not Available"}
      </Typography>
    </CardContent>
  {/* </Card> */}
</Popper>

    </>
  );
};

export default ManagerDetailsTooltip;
