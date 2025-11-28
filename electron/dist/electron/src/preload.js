"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
    selectDirectory: () => electron_1.ipcRenderer.invoke('select-directory'),
    // Authentication
    testLogin: () => electron_1.ipcRenderer.invoke('test-login'),
    // Reports
    runReport: (reportType, dateRange) => electron_1.ipcRenderer.invoke('run-report', reportType, dateRange),
    runBatch: (reports) => electron_1.ipcRenderer.invoke('run-batch', reports),
    resumeBatch: () => electron_1.ipcRenderer.invoke('resume-batch'),
    getBatchState: () => electron_1.ipcRenderer.invoke('get-batch-state'),
    // Scheduler
    setupScheduler: (enabled, scheduleTime) => electron_1.ipcRenderer.invoke('setup-scheduler', enabled, scheduleTime),
    // Logs
    getLogs: (level, limit) => electron_1.ipcRenderer.invoke('get-logs', level, limit),
    // Utilities
    openDownloads: () => electron_1.ipcRenderer.invoke('open-downloads'),
    // Google Drive
    getGDriveConfig: () => electron_1.ipcRenderer.invoke('get-gdrive-config'),
    updateGDriveConfig: (config) => electron_1.ipcRenderer.invoke('update-gdrive-config', config),
    testGDriveConnection: () => electron_1.ipcRenderer.invoke('test-gdrive-connection'),
    // Event listeners
    onReportProgress: (callback) => {
        electron_1.ipcRenderer.on('report-progress', (_event, data) => callback(data));
    },
    onBatchProgress: (callback) => {
        electron_1.ipcRenderer.on('batch-progress', (_event, data) => callback(data));
    },
    onScheduledRunTriggered: (callback) => {
        electron_1.ipcRenderer.on('scheduled-run-triggered', (_event, data) => callback(data));
    },
    // Remove listeners
    removeReportProgressListener: () => {
        electron_1.ipcRenderer.removeAllListeners('report-progress');
    },
    removeBatchProgressListener: () => {
        electron_1.ipcRenderer.removeAllListeners('batch-progress');
    },
    removeScheduledRunListener: () => {
        electron_1.ipcRenderer.removeAllListeners('scheduled-run-triggered');
    }
});
