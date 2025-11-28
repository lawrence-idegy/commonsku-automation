import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  service?: string;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    loadLogs();
  }, [filter, limit]);

  const loadLogs = async () => {
    try {
      const loadedLogs = await window.electron.getLogs(filter, limit);
      setLogs(loadedLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'error';
      case 'warn':
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.level?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Card>
        <CardContent>
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Log Level</InputLabel>
              <Select
                value={filter}
                label="Log Level"
                onChange={(e) => setFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Limit</InputLabel>
              <Select
                value={limit}
                label="Limit"
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <MenuItem value={50}>50 entries</MenuItem>
                <MenuItem value={100}>100 entries</MenuItem>
                <MenuItem value={250}>250 entries</MenuItem>
                <MenuItem value={500}>500 entries</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Search logs"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <FilterIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            <IconButton onClick={handleRefresh} title="Refresh logs">
              <RefreshIcon />
            </IconButton>

            <IconButton onClick={handleClearLogs} title="Clear display">
              <DeleteIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Log Display */}
          {filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No logs to display
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Logs will appear here as the application runs
              </Typography>
            </Box>
          ) : (
            <List
              sx={{
                maxHeight: '60vh',
                overflow: 'auto',
                bgcolor: 'background.default',
                borderRadius: 1,
                p: 0
              }}
            >
              {filteredLogs.map((log, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 1.5
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, width: '100%', alignItems: 'center' }}>
                      <Chip
                        label={log.level || 'info'}
                        size="small"
                        color={getLogColor(log.level) as any}
                        sx={{ minWidth: 60 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {log.timestamp || new Date().toLocaleString()}
                      </Typography>
                      {log.service && (
                        <Chip
                          label={log.service}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-word',
                        width: '100%'
                      }}
                    >
                      {log.message || 'No message'}
                    </Typography>
                  </ListItem>
                  {index < filteredLogs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          {filteredLogs.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Showing {filteredLogs.length} of {logs.length} log entries
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Logs;
