import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab} from "@mui/material";
import {queueActionNames, photoMeshActionNames} from '../types/enums';
import NativeSelector from '../components/NativeSelector'
import {getApiUrl} from '../config' 

const MiniLoggerPage: React.FC = () => {


//#region handling the Logs
//for logs:
const [logs, setLogs] = useState<any[]>([]);  // Logs that have been loaded so far
const [pagination, setPagination] = useState({
  limit: 5,
  offset: 0,
  total: 0,
});
const [isLoading, setIsLoading] = useState<boolean>(false);
const [selectedTab, setSelectedTab] = useState<number>(0);
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  
// Function to load logs from the API
const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1); // Default to 1 day
const [dateFetchFrom, setDateFetchFrom] = useState<string>(); 

useEffect(() => {
  // Calculate the dateFetchFrom based on selectedTimeRange
  const calculateDateFrom = () => {
    const currentDate = new Date(); // Get the current date
    currentDate.setDate(currentDate.getDate() - selectedTimeRange); // Subtract days based on selectedTimeRange
    console.log(currentDate.toISOString());
    return currentDate.toISOString();
  };

  setDateFetchFrom(calculateDateFrom());
  // refetch();
  // setLogs([]);
  // loadLogs(0,50);
}, [selectedTimeRange]);

const loadLogs = async (offset: number, limit: number) => {
  if (isLoading) return;  // Prevent concurrent requests
  setIsLoading(true);

  const logLevel = ["info", "warning", "error"][selectedTab] || "";


  try {
    const url = getApiUrl(`/queue/logs?limit=${limit}&offset=${offset}&level=${logLevel}&since=${dateFetchFrom}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch logs");
      return;
    }

    const data = await response.json();

    // Update the logs and pagination
    setLogs((prevLogs) => (offset === 0 ? data.logs : [...prevLogs, ...data.logs]));
    setPagination({
        limit: data.pagination.limit,
        offset: data.pagination.offset,
        total: data.pagination.total,
    });
    // setLogs((prevLogs) => [...prevLogs, ...data.logs]);  // Append new logs
    // setPagination((prevPagination) => ({
    //   ...prevPagination,
    //   offset: prevPagination.offset + data.logs.length,
    //   total: data.pagination.total,
    // }));


  } catch (error) {
    console.error("Error fetching logs:", error);
  } finally {
    setIsLoading(false);
  }
};


// Scroll event handler for lazy loading
const handleScrollLogs = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const target = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
  
    // Check if we're near the bottom of the container and not loading
    if (scrollTop + clientHeight >= scrollHeight - 10 && !isLoading && pagination.offset < pagination.total) {
      loadLogs(pagination.offset, pagination.limit);
    }
  };

// Fetch logs on component mount
useEffect(() => {
    setLogs([]); // Clear logs when the tab changes
    setPagination((prev) => ({
      ...prev,
      offset: 0, // Reset pagination
    }));
    loadLogs(0, pagination.limit); // Fetch logs for the new tab
}, [selectedTab,dateFetchFrom]);

  return (
    <>
       <Box className="custom-scrollbar" sx={{ 
              height: '100%',
              width: '100%',
              overflow: 'auto',
              p: 1 
            }}
            onScroll={handleScrollLogs}
            >

            
          <Box sx={{ 
                  position: 'sticky', 
                  top: 0, 
                  backgroundColor: '#F7F8FC', 
                  zIndex: 1, 
                  display: 'flex', // Use flexbox to align items horizontally
                  justifyContent: 'space-between', // Distribute space between tabs and selector
                  alignItems: 'center' // Vertically align items (tabs and selector)
                }}>
            <Tabs value={selectedTab} onChange={handleTabChange} aria-label="Project status tabs">
              {/* <Tab label= 'Info'/> */}
              <Tab label= 'Messages'/>
              <Tab label='Warning'/>
              <Tab label= 'Error'/>  
            </Tabs>
                <NativeSelector
                  title='Show logs from'
                  value={selectedTimeRange}
                  onChange={(value) => setSelectedTimeRange(value)}
                />
           </Box>
              {/* <Typography mt={2} variant="body2">Logger Output:</Typography> */}
              <Typography variant="caption">
                {/* {rowss()} */}
              {logs.map((log, index) => (
          <div key={`${log.id}-${index}`}>
            <p>-----------</p>
            <p style={{ margin: 0, lineHeight: 1.2 }}><strong>Time Stamp:</strong> {log.timestamp}</p>
            {/* <p><strong>Task GUID:</strong> {log.task_guid}</p> */}
            {/* <p><strong>Task Type:</strong> {log.task_type}</p> */}
            {/* <p><strong>Action:</strong> {photoMeshActionNames[log.task_action] || log.task_action}</p> */}
            <p style={{ margin: 0, lineHeight: 1.2 }}><strong>Action:</strong>
              {
              log.task_type === 'Queue' 
                ? queueActionNames[log.task_action] || 'Unknown'
                : photoMeshActionNames[log.task_action] || 'Unknown' 
              }
        </p>
            <p style={{ margin: 0, lineHeight: 1.2 }}><strong>Log message:</strong> {log.log_message}</p>

            {/* You can add more fields as necessary */}
          </div>
        ))}
        {isLoading && <div>Loading...</div>}  {/* Show loading indicator */}
        {pagination.offset >= pagination.total && <div>No more logs to load.</div>}  {/* Show "No more logs" when all logs are loaded */}
   
        {/* {isLoadingLogs && <div>Loading...</div>}   */}
      </Typography>
      </Box>
  </>
  );
};
export default MiniLoggerPage;
