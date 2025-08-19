import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Project } from './Project'; // Adjust this import path as necessary
import { motion, AnimatePresence } from 'framer-motion';
import NativeSelector from '../components/NativeSelector';
import { getApiUrl } from '../config';
import '../styles/scrollbar.css';
// import "../i18n";
//import { useTranslation } from "react-i18next";
const ManagerPage: React.FC<{ loggerSize: number }> = ({loggerSize}) => {

  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1); // Default to 1 day
  const [dateFetchFrom, setDateFetchFrom] = useState<string>(); 
  const [visibleProjectsCount, setVisibleProjectsCount] = useState(5); // Default to show 5 projects

  useEffect(() => {
    // Calculate the dateFetchFrom based on selectedTimeRange
    const calculateDateFrom = () => {
      const currentDate = new Date(); // Get the current date
      currentDate.setDate(currentDate.getDate() - selectedTimeRange); // Subtract days based on selectedTimeRange
      console.log(currentDate.toISOString());
      return currentDate.toISOString();
    };
  
    setDateFetchFrom(calculateDateFrom());
     refetch();
  }, [selectedTimeRange]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['queueData', dateFetchFrom],
    queryFn: async () => {
      const url = getApiUrl(`/queue/getqueue?since=${dateFetchFrom || ''}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Error fetching queue data");
      }
      return response.json();
    },
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
  });

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setVisibleProjectsCount(5);
    setSelectedTab(newValue);
  };

  // Handle scroll event to load more projects
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight === target.scrollTop + target.clientHeight;
        if (bottom) {
      setVisibleProjectsCount((prevCount) => prevCount + 5); // Show 5 more projects when reaching the bottom
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error fetching data</div>;
  }

  // Ensure the data has the expected structure before passing to Project component
  // let projects = data?.projects || [];
  // let queueStatus = data?.status;

  const activeProjectsCount = data?.projects.filter((project: any) => project.status === 'running' || project.status === 'pending').length;
  const completedProjectsCount = data?.projects.filter((project: any) => project.status === 'completed').length;
  const failedProjectsCount = data?.projects.filter((project: any) => project.status === 'failed').length;
  const abortedProjectsCount = data?.projects.filter((project: any) => project.status === 'aborted').length;

  // Filter projects based on the selected tab
  const filteredProjects = (() => {
    switch (selectedTab) {
      case 0: // Active Projects
        return data?.projects.filter((project: any) => project.status !== 'completed' && project.status !== 'failed' && project.status !== 'aborted');
      case 1: // Completed Projects
        return data?.projects.filter((project: any) => project.status === 'completed');
      case 2: // Failed Projects
        return data?.projects.filter((project: any) => project.status === 'failed');
      case 3: // Aborted Projects
        return data?.projects.filter((project: any) => project.status === 'aborted');
      default:
        return data?.projects; // Return all projects as a fallback
    }
  })();
  
  // Sort the filtered projects by order_index
  const sortedProjects = filteredProjects.sort((a: any, b: any) => {
    // For active projects (tab 0), keep ascending order (oldest first)
    if (selectedTab === 0) {
      return a.order_index - b.order_index;
    }
    // For all other tabs (completed, failed, aborted), use descending order (newest first)
    return b.order_index - a.order_index;
  });

  // Slice the sorted projects to display only the visible ones
  const visibleProjects = sortedProjects.slice(0, visibleProjectsCount);

  const moveProject = async (projId1: number, moveTo: string) => {
   
    // Find the project and its order_index
    const project1 = data?.projects.find((p: any) => p.id === projId1);
    if (!project1) return;

    const currentIndex = project1.order_index;
    const targetIndex = moveTo === "up" ? currentIndex - 1 : currentIndex + 1;

    // Find the project with the target order_index
    const project2 = data?.projects.find((p: any) => p.order_index === targetIndex);
    if (!project2) return;

    // Check if the target project is marked as "completed"
    if (project2.status === "completed") {
      console.warn("Cannot move project to a position occupied by a completed project.");
      return;
    }
    
    try {
      const url = getApiUrl(`/project/switch`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          projectId1: projId1,
          projectId2: project2.id 
        }),
      });

      if (!response.ok) {
        console.error("Failed to move project");
        return;
      }

      // Refetch the data to update the UI
      // refetch();
    } catch (error) {
      console.error("Error moving project:", error);
    }
    refetch();
  };

  //nst { t, i18n } = useTranslation(); //for language i18n

  return (
    <Box sx={{ p: 2 }}>
    {/* Tabs to switch between "completed" and "Not completed" projects */}
    <Box sx={{ 
      position: 'sticky', 
      top: 0, 
      backgroundColor: '#F7F8FC', 
      zIndex: 1, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    }}>
      <Tabs value={selectedTab} onChange={handleTabChange} aria-label="Project status tabs">
        <Tab label={ `Active (${activeProjectsCount})` }/>
        <Tab label={ `Completed (${completedProjectsCount})` }/>
        <Tab 
          label={ `Failed (${failedProjectsCount})` }
          className={failedProjectsCount > 0 ? 'blinking-tab' : ''} // Add CSS to make it blink if needed
        />
        <Tab label={ `Aborted (${abortedProjectsCount})` } />
      </Tabs>
      <NativeSelector
        title='Show projects from'
        value={selectedTimeRange}
        onChange={(value) => setSelectedTimeRange(value)}
      />
    </Box>

      {/* Display filtered projects */}
      <Box className="custom-scrollbar" sx={{ mt: 3,  maxHeight: (window.innerHeight-loggerSize-250), overflowY: 'auto' }} onScroll={handleScroll}>
        <AnimatePresence>
          {visibleProjects.map((project: any) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Project
                projStatus={project.status}
                projectID={project.id}
                projectName={project.project_key}
                data={project}
                queueStatus={data?.status}
                onMove={moveProject}
                onReRun={() => setSelectedTab(0)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default ManagerPage;
