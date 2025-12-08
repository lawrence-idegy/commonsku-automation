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
const automation_1 = require("./automation");
const scheduler_1 = require("./scheduler");
const logger_1 = require("./logger");
// Load environment variables
dotenv.config();
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const scheduler = new scheduler_1.ReportScheduler();
    const automation = new automation_1.CommonSKUAutomation();
    try {
        switch (command) {
            case 'dashboard':
                const dashboardDate = args[1] || 'Today';
                await automation.initialize();
                await automation.login();
                await automation.exportDashboardReport(dashboardDate);
                await automation.cleanup();
                break;
            case 'pipeline':
                const pipelineDate = args[1] || 'Today';
                await automation.initialize();
                await automation.login();
                await automation.exportPipelineReport(pipelineDate);
                await automation.cleanup();
                break;
            case 'sales-orders':
                const salesDate = args[1] || 'This Week';
                await automation.initialize();
                await automation.login();
                await automation.exportSalesOrdersReport(salesDate);
                await automation.cleanup();
                break;
            case 'scheduled':
                // Run based on today's schedule
                const schedule = scheduler.getScheduleForToday();
                logger_1.logger.info(`Running scheduled reports for: ${schedule}`);
                await scheduler.runScheduledReports(schedule);
                break;
            case 'daily':
                await scheduler.runScheduledReports('daily');
                break;
            case 'weekly':
                await scheduler.runScheduledReports('weekly');
                break;
            case 'monthly':
                await scheduler.runScheduledReports('monthly');
                break;
            case 'friday':
                await scheduler.runScheduledReports('friday');
                break;
            case 'all':
                await scheduler.runScheduledReports('all');
                break;
            // NEW: SR-only commands (Sales Rep reports only)
            case 'sr-daily':
                await scheduler.runScheduledReports('sr-daily');
                break;
            case 'sr-weekly':
                await scheduler.runScheduledReports('sr-weekly');
                break;
            case 'sr-friday':
                await scheduler.runScheduledReports('sr-friday');
                break;
            case 'cron':
                // Start the scheduler
                scheduler.startScheduler();
                break;
            case 'help':
            default:
                console.log(`
CommonSKU Reports Automation

Usage: npm run [command] [options]

=== SR-ONLY COMMANDS (RECOMMENDED) ===
  npm run sr-daily       Export Sales Rep report (Today only)
  npm run sr-weekly      Export Sales Rep report (This Week only)
  npm run sr-friday      Export Sales Rep reports (all periods: Today, This Week, Last Week, This Month, Last Month, This Year)
  npm run scheduled      Run based on today's schedule (Mon-Thu: sr-daily, Fri: sr-friday)

=== LEGACY COMMANDS (all 3 report types) ===
  npm run dashboard [dateRange]     Export dashboard report
  npm run pipeline [dateRange]      Export pipeline report
  npm run sales-orders [dateRange]  Export sales orders report
  npm run daily        Export all 3 reports (Today)
  npm run weekly       Export all 3 reports (This Week)
  npm run monthly      Export all 3 reports (This Month)
  npm run friday       Export all 3 reports (all periods - 18 reports)
  npm run all          Same as friday

=== SCHEDULER ===
  npm run cron         Start the scheduler (runs every day at 5 PM EST)

Date Ranges:
  Today, This Week, Last Week, This Month, Last Month, This Year, Last Year

Examples:
  npm run sr-daily                   # Just today's Sales Rep report
  npm run sr-friday                  # Friday's 6 Sales Rep reports
  npm run sales-orders "This Month"  # Sales Rep for This Month
  npm run scheduled                  # Auto-detect based on day of week

Schedule (sr-only mode):
  Mon-Thu: sr-daily (1 report)
  Friday:  sr-friday (6 reports)

Files are saved to: ${process.env.DOWNLOAD_DIR || 'C:\\Users\\Lawrence\\Downloads'}
File naming format: sr-monday-122025.csv (reporttype-dayofweek-MMYYYY.csv)
        `);
                break;
        }
        if (command !== 'cron' && command !== 'help') {
            logger_1.logger.info('Process completed successfully');
            process.exit(0);
        }
    }
    catch (error) {
        logger_1.logger.error('Fatal error occurred', error);
        process.exit(1);
    }
}
// Handle process termination
process.on('SIGINT', () => {
    logger_1.logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
// Run the main function
main().catch((error) => {
    logger_1.logger.error('Unhandled error in main', error);
    process.exit(1);
});
