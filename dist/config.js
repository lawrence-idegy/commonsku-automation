"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
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
        organizationType: process.env.GDRIVE_ORGANIZATION_TYPE || 'by-date',
        uploadAfterEachReport: process.env.GDRIVE_UPLOAD_AFTER_EACH === 'true',
        transferCount: parseInt(process.env.GDRIVE_TRANSFER_COUNT || '4'),
        showProgress: process.env.GDRIVE_SHOW_PROGRESS === 'true',
    },
    debug: process.env.DEBUG === 'true',
};
exports.default = config;
