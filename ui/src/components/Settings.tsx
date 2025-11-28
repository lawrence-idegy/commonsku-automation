import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Folder as FolderIcon,
  Visibility,
  VisibilityOff,
  Check as CheckIcon
} from '@mui/icons-material';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    username: '',
    password: '',
    headless: false,
    downloadPath: '',
    scheduleTime: '17:00',
    schedulerEnabled: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [testingLogin, setTestingLogin] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electron.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setAlert(null);

    try {
      const result = await window.electron.saveSettings(settings);

      if (result.success) {
        setAlert({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        setAlert({ type: 'error', message: `Failed to save: ${result.error}` });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const directory = await window.electron.selectDirectory();
      if (directory) {
        setSettings({ ...settings, downloadPath: directory });
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleTestLogin = async () => {
    setTestingLogin(true);
    setAlert(null);

    try {
      const result = await window.electron.testLogin();

      if (result.success) {
        setAlert({ type: 'success', message: 'Login test successful! Credentials are valid.' });
      } else {
        setAlert({
          type: 'error',
          message: `Login test failed: ${result.message || result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Error testing login: ${error}` });
    } finally {
      setTestingLogin(false);
    }
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    });
  };

  return (
    <Box>
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Credentials */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CommonSKU Credentials
              </Typography>

              <TextField
                label="Username / Email"
                fullWidth
                value={settings.username}
                onChange={handleChange('username')}
                margin="normal"
                helperText="Your CommonSKU login email"
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={settings.password}
                onChange={handleChange('password')}
                margin="normal"
                helperText="Your CommonSKU password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Button
                variant="outlined"
                onClick={handleTestLogin}
                disabled={testingLogin || !settings.username || !settings.password}
                startIcon={testingLogin ? undefined : <CheckIcon />}
                fullWidth
                sx={{ mt: 2 }}
              >
                {testingLogin ? 'Testing...' : 'Test Login'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Browser Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Browser Settings
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.headless}
                    onChange={handleChange('headless')}
                  />
                }
                label="Headless Mode"
                sx={{ mb: 2 }}
              />

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                When enabled, the browser will run in the background without a visible window.
                Disable this to see the browser for debugging.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Download Directory
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={settings.downloadPath}
                  onChange={handleChange('downloadPath')}
                  placeholder="Select download directory"
                  InputProps={{
                    readOnly: true
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleSelectDirectory}
                  startIcon={<FolderIcon />}
                >
                  Browse
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Where exported CSV files will be saved
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Navigation Timeout (ms)"
                    type="number"
                    fullWidth
                    defaultValue={60000}
                    helperText="Timeout for page navigation"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Action Timeout (ms)"
                    type="number"
                    fullWidth
                    defaultValue={30000}
                    helperText="Timeout for UI interactions"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Max Retries"
                    type="number"
                    fullWidth
                    defaultValue={3}
                    helperText="Login retry attempts"
                  />
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Modifying these values may affect automation stability. Only change if you know what you're doing.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={loadSettings}
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
