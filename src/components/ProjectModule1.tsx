import React from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';

export type TaskType = {
    id: number;
    name: string;
    description: string;
}

export const TaskTypes = [
    'PhotoMesh',
    'Condition',
    'Script',
    'HandleParams'
] as const;

export type Task = {
    id: number;
    project_id: number;
    guid: string;
    type: typeof TaskTypes[number];
    comment?: string;
    action: number;
    task_json: any;
    next_task_guid?: string;
    custom_condition?: string;
    is_active: boolean;
    status: string;
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
}

export const Summary: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const activeTasks = tasks.filter((task) => task.is_active).length;
    return (
        <Box sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 2, backgroundColor: '#f9f9f9' }}>
            <Typography variant="body1">
                Total Tasks: <strong>{tasks.length}</strong>
            </Typography>
            <Typography variant="body1">
                Active Tasks: <strong>{activeTasks}</strong>
            </Typography>
        </Box>
    );
};

export const TasksTable: React.FC<{ tasks: Task[]; columns: GridColDef[] }> = ({ tasks, columns }) => {
    return (
        <DataGrid
            rows={tasks.map((task) => ({
                ...task,
                type: task.task_json.type,
                next_task: task.next_task_guid ||  'N/A',
                active: task.is_active ? 'Yes' : 'No',
            }))}
            columns={columns}
            // initialState={{
            //     pagination: {
            //         paginationModel: { pageSize: 5 },
            //     },
            // }}
            // pageSizeOptions={[5, 10, 20]}
            autoHeight
        />
    );
};

export const Project: React.FC<{ projectName: string; tasks: Task[] }> = ({ projectName, tasks }) => {
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'comment', headerName: 'Comment', width: 150 },
        { field: 'type', headerName: 'Type', width: 100 },
        { field: 'action', headerName: 'Action', width: 100 },
        { field: 'next_task', headerName: 'Next Task', width: 120 },
        { field: 'active', headerName: 'Active', width: 100 },
        { field: 'status', headerName: 'Status', width: 120 },
        { field: 'started_at', headerName: 'Started At', width: 150 },
        { field: 'completed_at', headerName: 'Completed At', width: 150 },
    ];

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {projectName}
            </Typography>
            <Summary tasks={tasks} />
            <TasksTable tasks={tasks} columns={columns} />
        </Box>
    );
};

// ManagerPage Component
const ManagerPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
      queryKey: ['queueData'], // Query key
      queryFn: async () => {
          const response = await fetch("http://192.168.203.69:3000/queue/getqueue");
          if (!response.ok) {
              throw new Error("Error fetching queue data");
          }
          return response.json();
      },
      refetchInterval: 5000, // Refetch every 5 seconds to check for changes
      refetchOnWindowFocus: true, // Refetch when the window gains focus
  });

  if (isLoading) {
      return <div>Loading...</div>;
  }

  if (isError) {
      return <div>Error fetching data</div>;
  }

  return (
      <div>
          {/* Render your data here */}
          <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
  );
};

export default ManagerPage;
