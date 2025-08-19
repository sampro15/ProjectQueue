import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Typography, TextField } from '@mui/material';
import axios from 'axios';
import { getApiUrl } from '../config';
//icons:
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

const LoggerPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    id: 90,
    project_key: 100,
    log_level: 150,
    log_message: 400,
    timestamp: 200,
  });

  // Fetch logs from the API
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = getApiUrl(`/queue/logs`);

      const response = await axios.get(url);
      setLogs(response.data.logs); // Assume the server returns an array of logs
      setFilteredLogs(response.data.logs); // Initialize filtered logs
      console.log(response.data);
    } catch (err) {
      setError('Failed to fetch logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);

    // Apply search filter
    const filtered = logs.filter((log) =>
      Object.values(log).some((field) =>
        String(field).toLowerCase().includes(value.toLowerCase())
      )
    );
    setFilteredLogs(filtered);
  };

  const handleColumnResize = (params: any) => {
    setColumnWidths((prev) => ({
      ...prev,
      [params.colDef.field]: params.width,
    }));
  };

  // Define columns for the DataGrid
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: columnWidths.id, resizable: true },
    { field: 'project_key', headerName: 'Project', width: columnWidths.project_key },
    { field: 'log_level', headerName: 'Level', width: columnWidths.log_level },
    { field: 'log_message', headerName: 'Message', width: columnWidths.log_message },
    { field: 'timestamp', headerName: 'Timestamp', width: columnWidths.timestamp },
  ];



  const updatedColumns: GridColDef[] = columns.map((column) => {
    if (column.field === 'log_level') {
      // Modify the 'status' column to include the icon in the renderCell
      return {
        ...column,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'left', justifyContent: 'left' ,paddingTop:'12px'}}>
            <Typography variant="body2" sx={{ flexGrow: 1, textAlign: 'left' }}>{params.value}</Typography>

            { params.value === 'info' && (
                <InfoIcon sx={{ml: 1,color:'lightblue'}}/>
            )}
            {
               params.value === 'warning' && (
              <WarningIcon sx={{ml: 1,color:'Orange'}}/>
              )
            }
            {
              params.value === 'error' && (
              <ErrorIcon sx={{ml: 1,color:'Tomato'}}/>
              )
            }
          </Box>
        ),
      };
    }
    return column;
  });

  
  return (
    <Box sx={{ padding: '1rem', height: '100%', width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Logs
      </Typography>

      {/* Search Bar */}
      <TextField
        label="Search Logs"
        variant="outlined"
        fullWidth
        value={searchText}
        onChange={handleSearch}
        sx={{ marginBottom: '1rem',background:'white' }}
      />

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredLogs}
            columns={updatedColumns}
            onColumnResize={handleColumnResize}
            checkboxSelection
            disableRowSelectionOnClick={true}
            autoHeight
            
            hideFooter={true}
            sx={{
              backgroundColor: '#fff',
              boxShadow: 2,
              borderRadius: 2,
              border: '1px solid #ccc',
              '& .MuiDataGrid-columnSeparator': {
                visibility: 'visible',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700, // Adjust font weight (not fully bold but stronger than normal text)
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default LoggerPage;
