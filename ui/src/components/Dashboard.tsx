import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Box,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Folder as FolderIcon,
  MoreVert as MoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ReportProgress {
  reportType: string;
  dateRange: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  filePath?: string;
  error?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  in_progress: number;
}

const reportTypes = [
  { key: 'dashboard', label: 'Dashboard Report', color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
  { key: 'pipeline', label: 'Pipeline Report', color: '#34d399', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
  { key: 'sales-orders', label: 'Sales Rep Report', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }
];

const dateRanges = [
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Year'
];

const Dashboard: React.FC = () => {
  const [progress, setProgress] = useState<ReportProgress[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('Today');

  useEffect(() => {
    // Set up event listeners
    window.electron.onBatchProgress((data) => {
      if (data.progress) {
        setBatchProgress(data.progress);
      }
      if (data.currentTask) {
        updateProgress(data.currentTask);
      }
    });

    window.electron.onReportProgress((data) => {
      updateProgress(data);
    });

    return () => {
      window.electron.removeBatchProgressListener();
      window.electron.removeReportProgressListener();
    };
  }, []);

  const updateProgress = (report: any) => {
    // Normalize the field names (backend uses 'type', UI uses 'reportType')
    const normalizedReport: ReportProgress = {
      reportType: report.reportType || report.type,
      dateRange: report.dateRange,
      status: report.status,
      filePath: report.filePath,
      error: report.error
    };

    setProgress(prev => {
      const existing = prev.find(
        p => p.reportType === normalizedReport.reportType && p.dateRange === normalizedReport.dateRange
      );

      if (existing) {
        return prev.map(p =>
          p.reportType === normalizedReport.reportType && p.dateRange === normalizedReport.dateRange
            ? { ...p, ...normalizedReport }
            : p
        );
      }

      return [...prev, normalizedReport];
    });
  };

  const handleRunDaily = async () => {
    setIsRunning(true);
    setProgress([]);
    setBatchProgress(null);
    setAlert(null);

    try {
      const reports = reportTypes.map(rt => ({
        type: rt.key,
        dateRange: selectedDateRange
      }));

      const result = await window.electron.runBatch(reports);

      if (result.success) {
        setAlert({ type: 'success', message: `Successfully generated ${selectedDateRange} reports!` });
      } else {
        setAlert({ type: 'error', message: `Failed to generate reports: ${result.error}` });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSingle = async (reportType: string) => {
    setIsRunning(true);
    setAlert(null);

    try {
      const result = await window.electron.runReport(reportType, selectedDateRange);

      if (result.success) {
        setAlert({ type: 'success', message: `${reportType} report generated successfully!` });
        updateProgress({
          reportType,
          dateRange: selectedDateRange,
          status: 'completed',
          filePath: result.filePath
        });
      } else {
        setAlert({ type: 'error', message: `Failed: ${result.error}` });
        updateProgress({
          reportType,
          dateRange: selectedDateRange,
          status: 'failed',
          error: result.error
        });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  const handleResumeBatch = async () => {
    setIsRunning(true);
    setAlert(null);

    try {
      const result = await window.electron.resumeBatch();

      if (result.success) {
        setAlert({ type: 'success', message: 'Batch resumed successfully!' });
      } else {
        setAlert({ type: 'error', message: `Failed to resume: ${result.error}` });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenDownloads = () => {
    window.electron.openDownloads();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDateRangeSelect = (range: string) => {
    setSelectedDateRange(range);
    handleMenuClose();
  };

  return (
    <Box>
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Quick Actions</Typography>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleMenuOpen}
                    endIcon={<MoreIcon />}
                    sx={{ mr: 1 }}
                  >
                    {selectedDateRange}
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    {dateRanges.map(range => (
                      <MenuItem
                        key={range}
                        onClick={() => handleDateRangeSelect(range)}
                        selected={range === selectedDateRange}
                      >
                        {range}
                      </MenuItem>
                    ))}
                  </Menu>
                  <IconButton onClick={handleOpenDownloads} title="Open Downloads Folder">
                    <FolderIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={handleRunDaily}
                  disabled={isRunning}
                  sx={{
                    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                    boxShadow: '0 4px 14px 0 rgba(96, 165, 250, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: '0 6px 20px 0 rgba(96, 165, 250, 0.5)',
                    },
                    '&:disabled': {
                      background: 'rgba(96, 165, 250, 0.3)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Run All Reports ({selectedDateRange})
                </Button>

                {reportTypes.map(rt => (
                  <Button
                    key={rt.key}
                    variant="outlined"
                    size="large"
                    onClick={() => handleRunSingle(rt.key)}
                    disabled={isRunning}
                    sx={{
                      borderColor: rt.color,
                      color: rt.color,
                      borderWidth: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: rt.gradient,
                        opacity: 0,
                        transition: 'opacity 0.3s',
                        zIndex: -1,
                      },
                      '&:hover': {
                        borderColor: rt.color,
                        color: 'white',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {rt.label}
                  </Button>
                ))}

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<RefreshIcon />}
                  onClick={handleResumeBatch}
                  disabled={isRunning}
                  sx={{
                    borderColor: '#06b6d4',
                    color: '#06b6d4',
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: '#06b6d4',
                      background: 'rgba(6, 182, 212, 0.1)',
                    },
                  }}
                >
                  Resume Incomplete
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress */}
      {batchProgress && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Batch Progress
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Total: ${batchProgress.total}`}
                    color="default"
                  />
                  <Chip
                    label={`Completed: ${batchProgress.completed}`}
                    color="success"
                    icon={<CheckIcon />}
                  />
                  {batchProgress.in_progress > 0 && (
                    <Chip
                      label={`In Progress: ${batchProgress.in_progress}`}
                      color="info"
                    />
                  )}
                  <Chip
                    label={`Pending: ${batchProgress.pending}`}
                    color="warning"
                  />
                  {batchProgress.failed > 0 && (
                    <Chip
                      label={`Failed: ${batchProgress.failed}`}
                      color="error"
                      icon={<ErrorIcon />}
                    />
                  )}
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(batchProgress.completed / batchProgress.total) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Report Status */}
      {progress.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Status
                </Typography>
                <List>
                  {progress.map((p, index) => (
                    <React.Fragment key={`${p.reportType}-${p.dateRange}-${index}`}>
                      <ListItem>
                        <ListItemText
                          primary={`${p.reportType || 'Report'} - ${p.dateRange || 'Unknown'}`}
                          secondary={p.filePath || p.error || 'In progress...'}
                        />
                        {p.status === 'completed' && <CheckIcon color="success" />}
                        {p.status === 'failed' && <ErrorIcon color="error" />}
                        {p.status === 'in_progress' && <LinearProgress sx={{ width: 100 }} />}
                      </ListItem>
                      {index < progress.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {isRunning && progress.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress sx={{ width: 300, mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Initializing...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
