// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Typography,
//   List,
//   ListItem,
//   ListItemText,
//   ListItemIcon,
//   Divider,
//   Button,
//   Card,
//   CardContent,
// } from "@mui/material";

// import { useQuery } from "@tanstack/react-query";
// import { actionNames } from "../types/enums";
// import { PhotomeshStatus } from "../../server/types/types";

// const ManagerDetailsCard: React.FC<{ machineStatus: any }> = ({machineStatus,}) => {

// //   const [machineStatus, setMachineStatus] = useState<PhotomeshStatus>();

//   return (
//     <>
//       <Card sx={{ mb: 2, flexGrow: 1 }}>
//         <CardContent>
//           <Typography variant="h6">
//             <u>Manager Details</u>
//           </Typography>

//           <Typography variant="body2">
//             <strong>Manager:</strong>
//             {machineStatus?.WorkingFolder
//               ? machineStatus.WorkingFolder.match(/\[Manager=(.*?)\]/)?.[1] ||
//                 "Unknown"
//               : "Unknown"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Version:</strong>
//             {`${machineStatus?.PhotomeshVersion?.Major || "N/A"}.${
//               machineStatus?.PhotomeshVersion?.Minor || "N/A"
//             }.${machineStatus?.PhotomeshVersion?.Build || "N/A"}.${
//               machineStatus?.PhotomeshVersion?.Revision || "N/A"
//             }`}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Project:</strong>
//             {machineStatus?.ProjectPath || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Build Name:</strong>
//             {machineStatus?.BuildName || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Mode:</strong>
//             {machineStatus?.BuildStatus || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Working Folder:</strong>
//             {machineStatus?.WorkingFolder || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Max AWS Fusers:</strong>
//             {machineStatus?.MaxAWSFusers || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>AWS Build Configuration:</strong>
//             {machineStatus?.AWSBuildConfigurationName || "Not Available"}
//           </Typography>

//           <Typography variant="body2">
//             <strong>Max Pool Fusers:</strong>
//             {machineStatus?.MaxPoolFusers || "Not Available"}
//           </Typography>

//           {/* <Typography variant="body2">Additional details about the manager go here.</Typography>  */}
//         </CardContent>
//       </Card>
//     </>
//   );
// };
// export default ManagerDetailsCard;

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
} from "@mui/material";
// import "../i18n";
import { useTranslation } from "react-i18next";

const ManagerDetailsCard: React.FC<{ machineStatus: any }> = ({ machineStatus }) => {
  const details = [
    { label: "Manager", value: machineStatus?.WorkingFolder?.match(/\[Manager=(.*?)\]/)?.[1] || "Unknown" },
    {
      label: "Version",
      value: `${machineStatus?.PhotomeshVersion?.Major || "N/A"}.${
        machineStatus?.PhotomeshVersion?.Minor || "N/A"
      }.${machineStatus?.PhotomeshVersion?.Build || "N/A"}.${
        machineStatus?.PhotomeshVersion?.Revision || "N/A"
      }`,
    },
    { label: "Project", value: machineStatus?.ProjectPath || "Not Available" },
    { label: "Build Name", value: machineStatus?.BuildName || "Not Available" },
    { label: "Mode", value: machineStatus?.BuildStatus || "Not Available" },
    { label: "Working Folder", value: machineStatus?.WorkingFolder || "Not Available" },
    { label: "Max AWS Fusers", value: machineStatus?.MaxAWSFusers || "Not Available" },
    { label: "AWS Build Configuration", value: machineStatus?.AWSBuildConfigurationName || "Not Available" },
    { label: "Max Pool Fusers", value: machineStatus?.MaxPoolFusers || "Not Available" },
  ];

  const { t, i18n } = useTranslation(); //for language i18n

  return (
    <Card
      sx={{
        mb: 2,
        flexGrow: 1,
        borderRadius: 2,
        boxShadow: 2,
        backgroundColor: "background.paper",
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: "bold",
            mb: 1,
            textAlign: "center",
            textDecoration: "underline",
          }}
        >
          {t("Manager Details")}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table>
            <TableBody>
              {details.map((detail, index) => (
                <TableRow key={index}>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      borderBottom: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {detail.label}:
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "text.secondary",
                      borderBottom: "none",
                    }}
                  >
                    {detail.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default ManagerDetailsCard;
