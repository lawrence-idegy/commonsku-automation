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
exports.ReportScheduler = void 0;
const cron = __importStar(require("node-cron"));
const automation_1 = require("./automation");
const logger_1 = require("./logger");
class ReportScheduler {
    constructor() {
        this.automation = new automation_1.CommonSKUAutomation();
    }
    /**
     * Determine what reports to run based on the day of week
     * NEW schedule - SR (Sales Rep) reports ONLY:
     * - Daily (Mon-Thu): Download SR daily report (Today)
     * - Friday: Download SR for all periods (Today, This Week, Last Week, This Month, Last Month, This Year)
     */
    getScheduleForToday() {
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        switch (today) {
            case 1: // Monday
            case 2: // Tuesday
            case 3: // Wednesday
            case 4: // Thursday
                return 'sr-daily';
            case 5: // Friday
                return 'sr-friday'; // Download SR for all periods
            default:
                return 'sr-daily'; // Weekend fallback
        }
    }
    /**
     * Run reports based on schedule type
     */
    async runScheduledReports(schedule) {
        await this.automation.initialize();
        await this.automation.login();
        try {
            switch (schedule) {
                // NEW: SR-only modes (preferred)
                case 'sr-daily':
                    await this.runSRDailyReports();
                    break;
                case 'sr-weekly':
                    await this.runSRWeeklyReports();
                    break;
                case 'sr-friday':
                    await this.runSRFridayReports();
                    break;
                // Legacy modes (still available but not used by default)
                case 'daily':
                    await this.runDailyReports();
                    break;
                case 'weekly':
                    await this.runWeeklyReports();
                    break;
                case 'monthly':
                    await this.runMonthlyReports();
                    break;
                case 'friday':
                    await this.runFridayReports();
                    break;
                case 'all':
                    await this.runAllReports();
                    break;
            }
        }
        finally {
            await this.automation.cleanup();
        }
    }
    async runDailyReports() {
        logger_1.logger.info('Running daily reports...');
        // Dashboard - Today
        await this.automation.exportDashboardReport('Today');
        // Pipeline - Today
        await this.automation.exportPipelineReport('Today');
        // Sales Rep - Today
        await this.automation.exportSalesOrdersReport('Today');
    }
    async runWeeklyReports() {
        logger_1.logger.info('Running weekly reports...');
        // Dashboard - This Week
        await this.automation.exportDashboardReport('This Week');
        // Pipeline - This Week
        await this.automation.exportPipelineReport('This Week');
        // Sales Orders - This Week
        await this.automation.exportSalesOrdersReport('This Week');
    }
    async runMonthlyReports() {
        logger_1.logger.info('Running monthly reports (Wednesday)...');
        // On Wednesdays, download both daily and monthly reports
        // Daily reports
        await this.automation.exportDashboardReport('Today');
        await this.automation.exportPipelineReport('Today');
        await this.automation.exportSalesOrdersReport('Today');
        // Monthly reports - This Month & Last Month
        await this.automation.exportDashboardReport('This Month');
        await this.automation.exportDashboardReport('Last Month');
        await this.automation.exportPipelineReport('This Month');
        await this.automation.exportPipelineReport('Last Month');
        await this.automation.exportSalesOrdersReport('This Month');
        await this.automation.exportSalesOrdersReport('Last Month');
    }
    async runFridayReports() {
        logger_1.logger.info('Running Friday reports (comprehensive batch)...');
        // Friday: Download daily, weekly, previous week, monthly, previous month, and YTD
        const periods = [
            'Today', // Daily
            'This Week', // Weekly
            'Last Week', // Previous week
            'This Month', // Monthly
            'Last Month', // Previous month
            'This Year' // YTD
        ];
        for (const period of periods) {
            logger_1.logger.info(`Generating ${period} reports...`);
            await this.automation.exportDashboardReport(period);
            await this.automation.exportPipelineReport(period);
            await this.automation.exportSalesOrdersReport(period);
        }
    }
    async runAllReports() {
        logger_1.logger.info('Running all reports...');
        await this.runFridayReports(); // Friday includes everything
    }
    // ========================================
    // NEW: SR-Only Report Methods (Sales Rep Reports Only)
    // ========================================
    /**
     * Run SR (Sales Rep) daily report only - Today
     */
    async runSRDailyReports() {
        logger_1.logger.info('Running SR daily report (Sales Rep - Today only)...');
        await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport('Today'); }, 'SR-Today');
    }
    /**
     * Run SR (Sales Rep) weekly report only - This Week
     */
    async runSRWeeklyReports() {
        logger_1.logger.info('Running SR weekly report (Sales Rep - This Week only)...');
        await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport('This Week'); }, 'SR-This Week');
    }
    /**
     * Run SR (Sales Rep) Friday comprehensive batch
     * Downloads SR reports for all periods: Today, This Week, Last Week, This Month, Last Month, This Year
     */
    async runSRFridayReports() {
        logger_1.logger.info('Running SR Friday reports (Sales Rep - all periods)...');
        const periods = [
            'Today', // Daily
            'This Week', // Weekly
            'Last Week', // Previous week
            'This Month', // Monthly
            'Last Month', // Previous month
            'This Year' // YTD
        ];
        for (const period of periods) {
            logger_1.logger.info(`Generating SR ${period} report...`);
            await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport(period); }, `SR-${period}`);
        }
        logger_1.logger.info('SR Friday reports completed - 6 Sales Rep reports generated');
    }
    /**
     * Retry wrapper for flaky exports
     * Retries up to 3 times with exponential backoff
     */
    async runWithRetry(fn, reportName, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await fn();
                if (attempt > 1) {
                    logger_1.logger.info(`${reportName} succeeded on attempt ${attempt}`);
                }
                return;
            }
            catch (error) {
                lastError = error;
                logger_1.logger.warn(`${reportName} failed on attempt ${attempt}/${maxRetries}: ${lastError.message}`);
                if (attempt < maxRetries) {
                    const delay = attempt * 5000; // 5s, 10s, 15s
                    logger_1.logger.info(`Retrying ${reportName} in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        logger_1.logger.error(`${reportName} failed after ${maxRetries} attempts`);
        throw lastError;
    }
    /**
     * Start the cron scheduler
     */
    startScheduler() {
        // Run every day at 5:00 PM EST (17:00)
        cron.schedule('0 17 * * *', async () => {
            logger_1.logger.info('Starting scheduled report export...');
            try {
                // Run daily reports every day
                await this.runDailyReports();
                logger_1.logger.info('Scheduled reports completed successfully');
            }
            catch (error) {
                logger_1.logger.error('Scheduled reports failed', error);
            }
        }, {
            timezone: "America/New_York"
        });
        logger_1.logger.info('Report scheduler started - runs every day at 5:00 PM EST');
        // Keep the process running
        process.stdin.resume();
    }
    /**
     * Run a specific report type on demand
     */
    async runSpecificReport(reportType, dateRange) {
        await this.automation.initialize();
        await this.automation.login();
        try {
            switch (reportType) {
                case 'dashboard':
                    await this.automation.exportDashboardReport(dateRange);
                    break;
                case 'pipeline':
                    await this.automation.exportPipelineReport(dateRange);
                    break;
                case 'sales-orders':
                    await this.automation.exportSalesOrdersReport(dateRange);
                    break;
                default:
                    throw new Error(`Unknown report type: ${reportType}`);
            }
        }
        finally {
            await this.automation.cleanup();
        }
    }
}
exports.ReportScheduler = ReportScheduler;
