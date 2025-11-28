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

export {};
