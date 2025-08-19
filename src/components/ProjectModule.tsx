import React from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export type Task = {
  id: number;
  project_id: number;
  comment?: string;
  action: number;
  task_json: any; // JSONB type
  next_task_id?: number;
  custom_condition?: string;
  is_active: boolean;
  status: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
};

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
        next_task: task.next_task_id || 'N/A',
        active: task.is_active ? 'Yes' : 'No',
      }))}
      columns={columns}
      // initialState={{
      //   pagination: {
      //     paginationModel: { pageSize: 5 },
      //   },
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
