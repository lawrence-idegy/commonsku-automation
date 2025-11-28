import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

const config = {
  commonsku: {
    baseUrl: process.env.COMMONSKU_URL || 'https://idegy.commonsku.com',
    username: process.env.COMMONSKU_USERNAME || '',
    password: process.env.COMMONSKU_PASSWORD || '',
  },
  browser: {
    headless: process.env.HEADLESS === 'true',
    downloadPath: process.env.DOWNLOAD_DIR 
      ? path.resolve(process.env.DOWNLOAD_DIR)
      : path.join(process.cwd(), 'downloads'),
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '60000'),
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '30000'),
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '5000'),
  },
  reports: {
    dashboard: {
      filters: {
        repType: 'Client Rep',
        repGroup: 'Sales Team',
        dateRange: 'Today',
      },
    },
    pipeline: {
      filters: {
        dateRange: 'Today',
      },
    },
    salesOrders: {
      filters: {
        dateRange: 'This Week',
      },
    },
  },
  schedule: {
    runScheduled: process.env.RUN_SCHEDULED === 'true',
    scheduleTime: process.env.SCHEDULE_TIME || '09:00',
  },
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true',
    email: process.env.NOTIFICATION_EMAIL || '',
  },
  googleDrive: {
    enabled: process.env.GDRIVE_ENABLED === 'true',
    remoteName: process.env.GDRIVE_REMOTE_NAME || 'gdrive',
    remoteFolder: process.env.GDRIVE_REMOTE_FOLDER || 'CommonSKU Reports',
    organizationType: (process.env.GDRIVE_ORGANIZATION_TYPE as 'single' | 'by-date' | 'by-type' | 'by-structure') || 'by-date',
    uploadAfterEachReport: process.env.GDRIVE_UPLOAD_AFTER_EACH === 'true',
    transferCount: parseInt(process.env.GDRIVE_TRANSFER_COUNT || '4'),
    showProgress: process.env.GDRIVE_SHOW_PROGRESS === 'true',
  },
  debug: process.env.DEBUG === 'true',
};

export default config;
