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
     * New schedule:
     * - Daily (Mon-Thu): Download daily reports
     * - Wednesday: Also download monthly reports
     * - Friday: Download daily, weekly, previous week, monthly, previous month, and YTD
     */
    getScheduleForToday() {
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        switch (today) {
            case 1: // Monday
            case 2: // Tuesday
            case 4: // Thursday
                return 'daily';
            case 3: // Wednesday
                return 'monthly'; // Download monthly reports on Wednesdays
            case 5: // Friday
                return 'friday'; // Download all: daily, weekly, previous week, monthly, previous month, YTD
            default:
                return 'daily'; // Weekend fallback
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
