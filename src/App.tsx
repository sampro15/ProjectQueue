import React, { useState, useEffect } from 'react';
import { Route, Routes, NavLink  } from 'react-router-dom'; // Use NavLink for active styling
import { useLocation, Navigate} from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
} from '@mui/material';
import { keyframes } from '@mui/system';
import './styles/scrollbar.css';

import { Resizable } from 're-resizable';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EditIcon from '@mui/icons-material/Edit';
import LogIcon from './assest/LogIcon.svg';

// import { Project, Task } from './components/ProjectModule';
import VariablesEditPage from './components/VariablesEditPage'; // Import the new page
import { PhotomeshStatus } from '../server/types/types';
import QueueEditor from './components/queueEditor';
import ManagerPage from './components/ManagerPage'; 
import LoggerPage from  './components/LoggerPage';
import MiniLoggerPage from  './components/MiniLoggerPage';
import ManagerDetailsTooltip from './components/popper';


import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClient and QueryClientProvider

import { getApiUrl } from './config';
// import "./i18n";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

const drawerWidth = 300;


const App: React.FC = () => {
  const [machineStatus, setMachineStatus] = useState<PhotomeshStatus>();
  const [isOnline, setIsOnline] = useState(false);
  const [isPaused, setIsPaused] = useState(false);  // Tracks if the queue is paused
  const [scrollerSize, setScrollerSize] = useState({ width: '100%', height: 200 });
  const [selectedMenu,setSelectedMenu] = useState (0);

  const [queueStatus, setQueueStatus] = useState({
    current_project_id: null,
    project_key: null,
    current_task_id: null,
    progress: 0,
    status: "pending",
  });
  const location = useLocation(); // Now useLocation is inside the component

  const routes = {
    manager: "/ProjectQueue/manager",
    editor: "/ProjectQueue/editor",
    logger: "/ProjectQueue/logger",
    globalVars: "/ProjectQueue/global-vars",
  };

  const xomepp = (height: number,setMenu:number) => {
    setSelectedMenu(setMenu);
    setScrollerSize((prev) => ({
      ...prev,
      height: height,
    }));
  };
  
  const handleResizeStop = (
    _e: React.MouseEvent | React.TouchEvent, // MouseEvent or TouchEvent
    _direction: string,
    ref: HTMLElement,
    _d: { height: number; width: number }
  ) => {
    setScrollerSize((prev) => ({
      ...prev,
      height: ref.offsetHeight, // Update height based on manual resize
    }));
  };

  const handlePauseResume = async () => {
    const endpoint = isPaused
      ? "/queue/unpause"
      : "/queue/pause";
    const url = getApiUrl(endpoint);
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
      if (isPaused) {
        console.log("Queue Resumed");
        setIsPaused(false);
      } else {
        console.log("Queue Paused");
        setIsPaused(true);
      }
    }
  };

  const handleAbort = async() => {
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

  //const baseURL = "http://localhost:8087/ProjectQueue/";

    // Initial fetch on load
    useEffect(() => {
      const statusUpdateInterval = 1000;
      const intervalId = setInterval(() => {
      fetchIsAliveStatus();
      fetchQueueStatus();

    }, statusUpdateInterval);
  
      return () => clearInterval(intervalId);
    }, []);

//fetch the status of the Queue
const fetchQueueStatus = async () => {
  try {
    const url = getApiUrl(`/queue/status`);
    const response = await fetch(url, {
      method: "GET", 
      headers: {
        "Content-Type": "application/json", 
      },
    });

    // Check if the response is OK
    if (!response.ok) {
      console.error("NodeJS not responding");
      return;
    }

    // Parse the response data
    const data = await response.json();

    setQueueStatus({
      current_project_id: data.current_project_id,
      project_key: data.project_key,
      current_task_id: data.current_task_id,
      progress: data.progress,
      status: data.status,
    });
    // Check if the status is 'paused' and set isPaused accordingly
    if (data.status === "paused") {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }

    //setIsOnline(true); // Assuming machine is online if response is successful
  } catch (error) {
    console.error("Error checking Queue status:", error);
  }
};


    //fetch if PhotoMesh is Alive
  const fetchIsAliveStatus = async () => {
    try {
      const url = getApiUrl(`/queue/pmstatus`);

      const response = await fetch(url);
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

//#region  css key frames:
  const blink = keyframes`
  50% {
    opacity: 0.5;
  }
`;
//
const { t, i18n } = useTranslation(); //for language i18n

//#region The UI
return (
  // <Router>
     <Box sx={{ display: 'flex', height: '100vh' }}>
       <CssBaseline />
       <AppBar position="fixed"  sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 , backgroundColor: 'primary', color: '#FFFFFF',}}>
         <Toolbar >
           <Typography variant="h6" noWrap>
             {t("Queue Manager")}
           </Typography>
         </Toolbar>
       </AppBar>
       <Drawer
         variant="permanent"
         sx={{
           width: drawerWidth,
           flexShrink: 0,
           [`& .MuiDrawer-paper`]: {
             width: drawerWidth,
             boxSizing: 'border-box',
             backgroundColor: '#FFFFFF',
             padding: '1rem',
           },
         }}
       >
         <Toolbar />
         <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
           <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              
           </Typography>
<div  >
           <List>
             <ListItem component={NavLink} to={routes.manager} onClick={() => xomepp(200,0)}
               sx={({  }) => ({
                 backgroundColor: location.pathname === routes.manager ? '#E5EDF8' : 'transparent', // Highlight active page
                 color: location.pathname === routes.manager ? '#1976d2' : '#646871', // Change text color to blue when active
                 borderRadius: 3,
                 padding: '1rem',
               })}
             >
               <ListItemIcon
                     sx={{
                      color: location.pathname === routes.manager ? '#1976d2' : '#646871', // Change icon color to blue when active
                    }}
                    >
                 <DashboardIcon />
               </ListItemIcon>
               <ListItemText primary="Manager"      
               primaryTypographyProps={{ 
                 style: { color: location.pathname === routes.manager ? '#1976d2' : '#646871' } }}
               />
             </ListItem>

{/* by arik request we remove GlobalVars from side menu  */}
             {/* <ListItem component={NavLink} to={routes.globalVars} button onClick={() => xomepp(200,1)}
               sx={({ }) => ({
                 backgroundColor: location.pathname === routes.globalVars ? '#d0d0d0' : 'transparent', // Highlight active page
                 borderRadius: 3,
                 padding: '1rem',
                color: location.pathname === routes.globalVars ? '#1976d2' : '#646871', // Change text color to blue when active

               })}
             >
               <ListItemIcon
                  sx={{
        color: location.pathname === routes.globalVars ? '#1976d2' : '#646871', // Change icon color to blue when active
      }}>
                 <SettingsIcon />
               </ListItemIcon>
               <ListItemText primary="Global Vars" 
                 primaryTypographyProps={{ 
                 style: { color: location.pathname === routes.globalVars ? '#1976d2' : '#646871'} }}
               />
             </ListItem> */}

             <ListItem component={NavLink} to={routes.editor} onClick={() => xomepp(0,2)}// Pass the height as a parameter to hide the botom log
               sx={({ }) => ({
                 backgroundColor: location.pathname === routes.editor ? '#E5EDF8' : 'transparent', // Highlight active page // the color was : #d0d0d0 (gray)
                 color: location.pathname === routes.editor ? '#1976d2' : '#646871', // Change text color to blue when active
                 borderRadius: 3,
                 padding: '1rem',
               })}
             >
               <ListItemIcon
               sx={{
                color: location.pathname === routes.editor ? '#1976d2' : '#646871', // Change icon color to blue when active
              }}>
                 <EditIcon />
               </ListItemIcon>
               <ListItemText primary="Editor" 
                primaryTypographyProps={{ 
                style: { color: location.pathname === routes.editor ? '#1976d2' : '#646871' } }}
               />
             </ListItem>

             <ListItem component={NavLink} to={routes.logger}  onClick={() => xomepp(0,3)}  // Pass the height as a parameter to hide the botom log
               sx={({ }) => ({
                 backgroundColor: location.pathname === routes.logger ? '#E5EDF8' : 'transparent', // Highlight active page
                 color: location.pathname === routes.logger ? '#1976d2' : '#646871', // Change text color to blue when active
                 borderRadius: 3,
                 padding: '1rem',
               })}
             >
               <ListItemIcon
                     sx={{
                      color: location.pathname === routes.logger ? '#1976d2' : '#646871', // Change icon color to blue when active
                    }}>
                 <img src={LogIcon} style={{ filter: 'invert(100%) sepia(0%) saturate(0%) brightness(50%) contrast(100%)',width: '24px', height: '24px' }} />
               </ListItemIcon>
               <ListItemText primary="Messages" 
                 primaryTypographyProps={{ 
                 style: { color: location.pathname === routes.logger ? '#1976d2' : '#646871' } }}
               />
             </ListItem>
           </List>
 </div>
           <Divider sx={{ mt: 2, mb: 2 }} />
           <ManagerDetailsTooltip isOnline={isOnline} machineStatus={machineStatus}/>
           <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
           

{/* Sliding Box */}

               <Box
                 sx={{
                   
                   position: 'fixed',
                   bottom: 0,
                   left: 0,
                   ml:0.5,
                   width: `${drawerWidth - 5}px`, // Matches the side menu width
                   backgroundColor: '#fff',
                   //boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
                   p: 2,
                   display: 'block', // Always keep it in the layout for smooth transitions
                   flexDirection: 'column',
                   gap: 2,
                   // -- Uncoment it if you want toast animated
                  //  transform: location.pathname !== routes.manager || queueStatus.status === 'paused' ? 'translateY(0)' : 'translateY(100%)',
                  //  opacity: location.pathname !== routes.manager || queueStatus.status === 'paused' ? 1 : 0,
                  //  visibility: location.pathname !== routes.manager || queueStatus.status === 'paused' ? 'visible' : 'hidden',
                  //  transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out, visibility 0.5s',
                 }}
               >

                <Divider sx={{ mt: 2, mb: 2 }} />

                 <Typography variant="subtitle1" align="center">
                   Current Project: {queueStatus.project_key ||'None'}
                 </Typography>
                 <Typography mb={2}  variant="subtitle2" align="center" color="text.secondary">
                   Queue Status: {queueStatus.status || 'Idle'}
                 </Typography>
                 <Box sx={{ display: 'flex', gap: 1}}>
                 {isPaused &&(
                     <Button  variant="contained" color="primary" fullWidth         
                     sx={{
                       ml: 1,
                       animation: `${blink} 1.5s infinite`,
                     }} 
                     onClick={handlePauseResume}>
                     {t("Resume")}
                     </Button>
                     )}
                     {!isPaused &&(
                         <Button variant="outlined" color="primary" fullWidth onClick={handlePauseResume}>
                         {t("Pause")}
                       </Button>
                     )}
                   <Button variant="outlined" color="error" onClick={handleAbort}   fullWidth>
                   {t("Abort")}
                   </Button>
                 </Box>
               </Box>

           </Box>

         </Box>
       </Drawer>
       <Box
         component="main"
         sx={{ 
           flexGrow: 1,
           p: 3,
           display: 'flex',
           flexDirection: 'column',
           height: '100vh',
           overflow: 'hidden',
           backgroundColor: '#F7F8FC'
         }}
       >
         <Toolbar />
{/**MainPage */}         
         <Box className="custom-scrollbar" sx={{ 
           height: '100vh', 
           width: '80vw',
           flexGrow: 1, 
           overflow: 'auto',
           mb: 2
         }}>
{/**Routes to display in MainPage */}
           <Routes>
             <Route path={routes.manager} element={
                 <QueryClientProvider client={queryClient}>
                 <ManagerPage loggerSize={scrollerSize.height}/>
               </QueryClientProvider>
             } />
             <Route path={routes.globalVars} element={<VariablesEditPage />} />
             <Route path={routes.editor} element={<QueueEditor/>} />
             <Route path={routes.logger} element={<LoggerPage/>} />
               {/* Redirect from `/` to `/manager` */}
            <Route path="*" element={<Navigate to={routes.manager} replace />} />
           </Routes>
         </Box>
{/* Logger */ }
         <Resizable className="custom-scrollbar"
           defaultSize={scrollerSize}
           size={scrollerSize}  
           onResizeStop={handleResizeStop as unknown as (e: any, direction: any, ref: HTMLElement, d: any) => void} // Cast to remove type mismatch
           enable={{ top: true }}
           style={{
             borderTop: '1px solid #ccc',
             overflow: 'hidden'
           }}
         >
           <MiniLoggerPage ></MiniLoggerPage>
         </Resizable>
       </Box>
     </Box>
  // </Router>
 );
};

export default App;
