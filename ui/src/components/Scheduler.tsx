import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { format, addDays, isToday, parseISO } from 'date-fns';

const Scheduler: React.FC = () => {
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();

    // Listen for scheduled runs
    window.electron.onScheduledRunTriggered((data) => {
      setAlert({
        type: 'info',
        message: `Scheduled run triggered with ${data.reports.length} reports`
      });
    });

    return () => {
      window.electron.removeScheduledRunListener();
    };
  }, []);

  useEffect(() => {
    if (schedulerEnabled && scheduleTime) {
      calculateNextRun();
    }
  }, [schedulerEnabled, scheduleTime]);

  const loadSettings = async () => {
    try {
      const settings = await window.electron.getSettings();
      setSchedulerEnabled(settings.schedulerEnabled || false);
      setScheduleTime(settings.scheduleTime || '17:00');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const calculateNextRun = () => {
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const now = new Date();
    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next = addDays(next, 1);
    }

    setNextRun(next);
  };

  const handleToggleScheduler = async (enabled: boolean) => {
    setLoading(true);
    setAlert(null);

    try {
      const result = await window.electron.setupScheduler(enabled, scheduleTime);

      if (result.success) {
        setSchedulerEnabled(enabled);
        setAlert({
          type: 'success',
          message: enabled ? `Scheduler enabled for ${scheduleTime} EST` : 'Scheduler disabled'
        });
      } else {
        setAlert({ type: 'error', message: `Failed: ${result.error}` });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScheduleTime(event.target.value);
  };

  const handleApplyTime = async () => {
    if (schedulerEnabled) {
      await handleToggleScheduler(true);
    }
  };

  const presetTimes = [
    { label: 'Early Morning', time: '06:00' },
    { label: 'Morning', time: '09:00' },
    { label: 'Noon', time: '12:00' },
    { label: 'Afternoon', time: '15:00' },
    { label: 'Evening', time: '17:00' },
    { label: 'Night', time: '21:00' }
  ];

  return (
    <Box>
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Scheduler Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Automated Scheduler</Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={schedulerEnabled}
                    onChange={(e) => handleToggleScheduler(e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label={schedulerEnabled ? 'Scheduler Enabled' : 'Scheduler Disabled'}
                sx={{ mb: 3 }}
              />

              <Divider sx={{ mb: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Schedule Time (EST)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  type="time"
                  value={scheduleTime}
                  onChange={handleTimeChange}
                  disabled={loading}
                  fullWidth
                  InputProps={{
                    startAdornment: <TimeIcon sx={{ mr: 1 }} />
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleApplyTime}
                  disabled={loading || !schedulerEnabled}
                >
                  Apply
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Daily reports will run automatically at the specified time
              </Typography>

              {/* Preset Times */}
              <Typography variant="subtitle2" gutterBottom>
                Quick Presets
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {presetTimes.map(preset => (
                  <Chip
                    key={preset.time}
                    label={`${preset.label} (${preset.time})`}
                    onClick={() => setScheduleTime(preset.time)}
                    color={scheduleTime === preset.time ? 'primary' : 'default'}
                    variant={scheduleTime === preset.time ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedule Information
              </Typography>

              <List>
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        {schedulerEnabled ? (
                          <>
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="body2" color="success.main">
                              Active
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Inactive
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>

                <Divider />

                <ListItem>
                  <ListItemText
                    primary="Schedule Time"
                    secondary={`${scheduleTime} EST (Eastern Time)`}
                  />
                </ListItem>

                <Divider />

                <ListItem>
                  <ListItemText
                    primary="Next Run"
                    secondary={
                      schedulerEnabled && nextRun
                        ? format(nextRun, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
                        : 'Not scheduled'
                    }
                  />
                </ListItem>

                <Divider />

                <ListItem>
                  <ListItemText
                    primary="Reports Generated"
                    secondary="Dashboard, Pipeline, Sales Rep (Today)"
                  />
                </ListItem>

                <Divider />

                <ListItem>
                  <ListItemText
                    primary="Frequency"
                    secondary="Daily (every day at the scheduled time)"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  The application must be running for scheduled tasks to execute. Consider setting up the application
                  to start automatically with your system.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Runs (Placeholder) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Scheduled Runs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent runs to display. Scheduled runs will appear here once the scheduler is active.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Scheduler;
