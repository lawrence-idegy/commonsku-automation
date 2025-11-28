import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Authentication
  testLogin: () => ipcRenderer.invoke('test-login'),

  // Reports
  runReport: (reportType: string, dateRange: string) =>
    ipcRenderer.invoke('run-report', reportType, dateRange),
  runBatch: (reports: Array<{ type: string; dateRange: string }>) =>
    ipcRenderer.invoke('run-batch', reports),
  resumeBatch: () => ipcRenderer.invoke('resume-batch'),
  getBatchState: () => ipcRenderer.invoke('get-batch-state'),

  // Scheduler
  setupScheduler: (enabled: boolean, scheduleTime: string) =>
    ipcRenderer.invoke('setup-scheduler', enabled, scheduleTime),

  // Logs
  getLogs: (level: string, limit: number) => ipcRenderer.invoke('get-logs', level, limit),

  // Utilities
  openDownloads: () => ipcRenderer.invoke('open-downloads'),

  // Google Drive
  getGDriveConfig: () => ipcRenderer.invoke('get-gdrive-config'),
  updateGDriveConfig: (config: any) => ipcRenderer.invoke('update-gdrive-config', config),
  testGDriveConnection: () => ipcRenderer.invoke('test-gdrive-connection'),

  // Event listeners
  onReportProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('report-progress', (_event, data) => callback(data));
  },
  onBatchProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('batch-progress', (_event, data) => callback(data));
  },
  onScheduledRunTriggered: (callback: (data: any) => void) => {
    ipcRenderer.on('scheduled-run-triggered', (_event, data) => callback(data));
  },

  // Remove listeners
  removeReportProgressListener: () => {
    ipcRenderer.removeAllListeners('report-progress');
  },
  removeBatchProgressListener: () => {
    ipcRenderer.removeAllListeners('batch-progress');
  },
  removeScheduledRunListener: () => {
    ipcRenderer.removeAllListeners('scheduled-run-triggered');
  }
});

// Type definitions for TypeScript
export interface ElectronAPI {
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<any>;
  selectDirectory: () => Promise<string | null>;
  testLogin: () => Promise<{ success: boolean; message?: string; error?: string }>;
  runReport: (reportType: string, dateRange: string) => Promise<any>;
  runBatch: (reports: Array<{ type: string; dateRange: string }>) => Promise<any>;
  resumeBatch: () => Promise<any>;
  getBatchState: () => Promise<any>;
  setupScheduler: (enabled: boolean, scheduleTime: string) => Promise<any>;
  getLogs: (level: string, limit: number) => Promise<any[]>;
  openDownloads: () => Promise<any>;
  getGDriveConfig: () => Promise<any>;
  updateGDriveConfig: (config: any) => Promise<any>;
  testGDriveConnection: () => Promise<any>;
  onReportProgress: (callback: (data: any) => void) => void;
  onBatchProgress: (callback: (data: any) => void) => void;
  onScheduledRunTriggered: (callback: (data: any) => void) => void;
  removeReportProgressListener: () => void;
  removeBatchProgressListener: () => void;
  removeScheduledRunListener: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
