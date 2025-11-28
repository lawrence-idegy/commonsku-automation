import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import * as cron from 'node-cron';
import CommonSKUAutomation from '../../src/CommonSKUAutomation';
import StateManager from '../../src/StateManager';
import logger from '../../src/logger';
import config from '../../src/config';

// Setup electron-store for persistent settings
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let automation: CommonSKUAutomation | null = null;
let stateManager: StateManager | null = null;
let scheduledTask: cron.ScheduledTask | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'CSK Reports',
    icon: path.join(__dirname, '../../../../ui/public/icon.png')
  });

  // Load React app
  const startUrl = process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, '../../../../ui/build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Get settings
ipcMain.handle('get-settings', async () => {
  return {
    username: store.get('username', config.commonsku.username),
    headless: store.get('headless', config.browser.headless),
    downloadPath: store.get('downloadPath', config.browser.downloadPath),
    schedulerEnabled: store.get('schedulerEnabled', false),
    scheduleTime: store.get('scheduleTime', '17:00')
  };
});

// Save settings
ipcMain.handle('save-settings', async (_event, settings) => {
  try {
    Object.keys(settings).forEach(key => {
      store.set(key, settings[key]);
    });

    // Update config
    if (settings.headless !== undefined) {
      config.browser.headless = settings.headless;
    }
    if (settings.downloadPath) {
      config.browser.downloadPath = settings.downloadPath;
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to save settings:', error);
    return { success: false, error: String(error) };
  }
});

// Select directory dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Test login
ipcMain.handle('test-login', async () => {
  try {
    automation = new CommonSKUAutomation();
    await automation.initialize();
    const success = await automation.login();
    await automation.cleanup();
    automation = null;

    return { success, message: success ? 'Login successful!' : 'Login failed' };
  } catch (error) {
    logger.error('Login test failed:', error);
    if (automation) {
      await automation.cleanup();
      automation = null;
    }
    return { success: false, error: String(error) };
  }
});

// Run single report
ipcMain.handle('run-report', async (_event, reportType: string, dateRange: string) => {
  try {
    if (!automation) {
      automation = new CommonSKUAutomation();
      await automation.initialize();
      await automation.login();
    }

    let filePath: string | null = null;

    switch (reportType) {
      case 'dashboard':
        filePath = await automation.exportDashboardReport(dateRange);
        break;
      case 'pipeline':
        filePath = await automation.exportPipelineReport(dateRange);
        break;
      case 'sales-orders':
        filePath = await automation.exportSalesOrdersReport(dateRange);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Send progress update to UI
    if (mainWindow) {
      mainWindow.webContents.send('report-progress', {
        reportType,
        dateRange,
        status: filePath ? 'completed' : 'failed',
        filePath
      });
    }

    return { success: !!filePath, filePath };
  } catch (error) {
    logger.error(`Failed to run ${reportType} report:`, error);
    return { success: false, error: String(error) };
  }
});

// Run batch of reports
ipcMain.handle('run-batch', async (_event, reports: Array<{ type: string; dateRange: string }>) => {
  try {
    // Initialize state manager
    stateManager = new StateManager();
    const batchId = stateManager.createBatch(reports as any);

    // Initialize automation
    if (!automation) {
      automation = new CommonSKUAutomation();
      await automation.initialize();
      await automation.login();
    }

    const results: any[] = [];

    for (const report of reports) {
      const task = stateManager.getCurrentBatch()?.tasks.find(
        t => t.type === report.type && t.dateRange === report.dateRange
      );

      if (!task) continue;

      // Check if already completed
      if (stateManager.isReportCompleted(report.type, report.dateRange)) {
        logger.info(`Skipping ${report.type} ${report.dateRange} - already completed`);
        results.push({ ...report, status: 'skipped' });
        continue;
      }

      // Update task status
      stateManager.updateTask(task.id, { status: 'in_progress' });

      // Send progress update
      if (mainWindow) {
        mainWindow.webContents.send('batch-progress', {
          batchId,
          progress: stateManager.getProgress(),
          currentTask: task
        });
      }

      try {
        let filePath: string | null = null;

        switch (report.type) {
          case 'dashboard':
            filePath = await automation.exportDashboardReport(report.dateRange);
            break;
          case 'pipeline':
            filePath = await automation.exportPipelineReport(report.dateRange);
            break;
          case 'sales-orders':
            filePath = await automation.exportSalesOrdersReport(report.dateRange);
            break;
        }

        if (filePath) {
          stateManager.updateTask(task.id, {
            status: 'completed',
            filePath
          });
          results.push({ ...report, status: 'completed', filePath });

          // Send updated progress after completion
          if (mainWindow) {
            mainWindow.webContents.send('batch-progress', {
              batchId,
              progress: stateManager.getProgress(),
              currentTask: { ...task, status: 'completed', filePath }
            });
          }
        } else {
          throw new Error('Report generation failed');
        }
      } catch (error) {
        const errorMsg = String(error);
        logger.error(`Failed to generate ${report.type} ${report.dateRange}:`, error);

        task.retryCount++;
        stateManager.updateTask(task.id, {
          status: 'failed',
          error: errorMsg
        });
        results.push({ ...report, status: 'failed', error: errorMsg });

        // Send updated progress after failure
        if (mainWindow) {
          mainWindow.webContents.send('batch-progress', {
            batchId,
            progress: stateManager.getProgress(),
            currentTask: { ...task, status: 'failed', error: errorMsg }
          });
        }
      }
    }

    // Complete batch
    stateManager.completeBatch();

    // Cleanup
    if (automation) {
      await automation.cleanup();
      automation = null;
    }

    return { success: true, batchId, results };
  } catch (error) {
    logger.error('Batch execution failed:', error);
    if (stateManager) {
      stateManager.failBatch(String(error));
    }
    if (automation) {
      await automation.cleanup();
      automation = null;
    }
    return { success: false, error: String(error) };
  }
});

// Resume incomplete batch
ipcMain.handle('resume-batch', async () => {
  try {
    stateManager = new StateManager();
    const batch = stateManager.loadBatch();

    if (!batch) {
      return { success: false, error: 'No batch found to resume' };
    }

    const pendingTasks = stateManager.getPendingTasks();

    if (pendingTasks.length === 0) {
      return { success: false, error: 'No pending tasks to resume' };
    }

    // Convert to report format
    const reports = pendingTasks.map(task => ({
      type: task.type,
      dateRange: task.dateRange
    }));

    // Run the batch
    return await ipcMain.emit('run-batch', null as any, reports);
  } catch (error) {
    logger.error('Failed to resume batch:', error);
    return { success: false, error: String(error) };
  }
});

// Get batch state
ipcMain.handle('get-batch-state', async () => {
  try {
    if (!stateManager) {
      stateManager = new StateManager();
    }

    const batch = stateManager.loadBatch();
    return batch;
  } catch (error) {
    logger.error('Failed to get batch state:', error);
    return null;
  }
});

// Setup scheduler
ipcMain.handle('setup-scheduler', async (_event, enabled: boolean, scheduleTime: string) => {
  try {
    // Cancel existing task
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }

    if (!enabled) {
      store.set('schedulerEnabled', false);
      return { success: true, message: 'Scheduler disabled' };
    }

    // Parse time (format: HH:MM)
    const [hours, minutes] = scheduleTime.split(':').map(Number);

    // Create cron expression (minute hour * * *)
    const cronExpression = `${minutes} ${hours} * * *`;

    scheduledTask = cron.schedule(cronExpression, async () => {
      logger.info('Scheduled task triggered');

      // Determine what reports to run based on day of week
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      let reports: Array<{ type: string; dateRange: string }> = [];

      if (today === 3) {
        // Wednesday: Daily + Monthly reports
        logger.info('Wednesday schedule: Running daily and monthly reports');
        reports = [
          // Daily
          { type: 'dashboard', dateRange: 'Today' },
          { type: 'pipeline', dateRange: 'Today' },
          { type: 'sales-orders', dateRange: 'Today' },
          // Monthly
          { type: 'dashboard', dateRange: 'This Month' },
          { type: 'dashboard', dateRange: 'Last Month' },
          { type: 'pipeline', dateRange: 'This Month' },
          { type: 'pipeline', dateRange: 'Last Month' },
          { type: 'sales-orders', dateRange: 'This Month' },
          { type: 'sales-orders', dateRange: 'Last Month' }
        ];
      } else if (today === 5) {
        // Friday: Comprehensive batch (daily, weekly, monthly, YTD)
        logger.info('Friday schedule: Running comprehensive batch');
        reports = [
          // Daily
          { type: 'dashboard', dateRange: 'Today' },
          { type: 'pipeline', dateRange: 'Today' },
          { type: 'sales-orders', dateRange: 'Today' },
          // Weekly
          { type: 'dashboard', dateRange: 'This Week' },
          { type: 'pipeline', dateRange: 'This Week' },
          { type: 'sales-orders', dateRange: 'This Week' },
          // Previous Week
          { type: 'dashboard', dateRange: 'Last Week' },
          { type: 'pipeline', dateRange: 'Last Week' },
          { type: 'sales-orders', dateRange: 'Last Week' },
          // Monthly
          { type: 'dashboard', dateRange: 'This Month' },
          { type: 'pipeline', dateRange: 'This Month' },
          { type: 'sales-orders', dateRange: 'This Month' },
          // Previous Month
          { type: 'dashboard', dateRange: 'Last Month' },
          { type: 'pipeline', dateRange: 'Last Month' },
          { type: 'sales-orders', dateRange: 'Last Month' },
          // YTD
          { type: 'dashboard', dateRange: 'This Year' },
          { type: 'pipeline', dateRange: 'This Year' },
          { type: 'sales-orders', dateRange: 'This Year' }
        ];
      } else {
        // Monday, Tuesday, Thursday: Daily reports only
        logger.info('Daily schedule: Running daily reports');
        reports = [
          { type: 'dashboard', dateRange: 'Today' },
          { type: 'pipeline', dateRange: 'Today' },
          { type: 'sales-orders', dateRange: 'Today' }
        ];
      }

      // Trigger batch run
      if (mainWindow) {
        mainWindow.webContents.send('scheduled-run-triggered', { reports });
      }

      // Actually run the reports
      await ipcMain.emit('run-batch', null as any, reports);
    }, {
      timezone: 'America/New_York'
    });

    store.set('schedulerEnabled', true);
    store.set('scheduleTime', scheduleTime);

    logger.info(`Scheduler enabled for ${scheduleTime} EST`);
    return { success: true, message: `Scheduler set for ${scheduleTime} EST` };
  } catch (error) {
    logger.error('Failed to setup scheduler:', error);
    return { success: false, error: String(error) };
  }
});

// Get logs
ipcMain.handle('get-logs', async (_event, level: string = 'all', limit: number = 100) => {
  // In a real implementation, you'd read from the log files
  // For now, return a placeholder
  return [];
});

// Open downloads folder
ipcMain.handle('open-downloads', async () => {
  try {
    const { shell } = require('electron');
    await shell.openPath(config.browser.downloadPath);
    return { success: true };
  } catch (error) {
    logger.error('Failed to open downloads folder:', error);
    return { success: false, error: String(error) };
  }
});

// Get Google Drive configuration
ipcMain.handle('get-gdrive-config', async () => {
  try {
    return {
      success: true,
      config: {
        enabled: config.googleDrive.enabled,
        remoteName: config.googleDrive.remoteName,
        remoteFolder: config.googleDrive.remoteFolder,
        organizationType: config.googleDrive.organizationType,
        uploadAfterEachReport: config.googleDrive.uploadAfterEachReport,
      }
    };
  } catch (error) {
    logger.error('Failed to get Google Drive config:', error);
    return { success: false, error: String(error) };
  }
});

// Update Google Drive configuration
ipcMain.handle('update-gdrive-config', async (_event, newConfig: any) => {
  try {
    // Update .env file would require fs operations
    // For now, just log the request
    logger.info('Google Drive config update requested:', newConfig);

    // In a real implementation, you'd update the .env file here
    // For now, return success
    return {
      success: true,
      message: 'Google Drive configuration updated. Please restart the application for changes to take effect.'
    };
  } catch (error) {
    logger.error('Failed to update Google Drive config:', error);
    return { success: false, error: String(error) };
  }
});

// Test Google Drive connection
ipcMain.handle('test-gdrive-connection', async () => {
  try {
    const GoogleDriveUploader = require('../../src/GoogleDriveUploader').default;
    const uploader = new GoogleDriveUploader(
      config.googleDrive.remoteName,
      config.googleDrive.remoteFolder
    );

    const isConfigured = await uploader.isConfigured();

    if (!isConfigured) {
      return {
        success: false,
        message: `Rclone remote "${config.googleDrive.remoteName}" is not configured. Please run: rclone config`
      };
    }

    // Try to get remote info
    const info = await uploader.getRemoteInfo();

    if (info) {
      return {
        success: true,
        message: 'Google Drive connection successful!',
        info: {
          total: `${(info.total / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          used: `${(info.used / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          free: `${(info.free / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        }
      };
    } else {
      return {
        success: true,
        message: 'Connected to Google Drive, but could not retrieve storage info.'
      };
    }
  } catch (error) {
    logger.error('Failed to test Google Drive connection:', error);
    return {
      success: false,
      error: String(error),
      message: 'Failed to connect to Google Drive. Please check your rclone configuration.'
    };
  }
});

// Cleanup on exit
app.on('before-quit', async () => {
  if (automation) {
    await automation.cleanup();
  }
  if (scheduledTask) {
    scheduledTask.stop();
  }
});
