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
            case 'cron':
                // Start the scheduler
                scheduler.startScheduler();
                break;
            case 'help':
            default:
                console.log(`
CommonSKU Reports Automation

Usage: npm run [command] [options]

Commands:
  npm run dashboard [dateRange]     Export dashboard report
  npm run pipeline [dateRange]      Export pipeline report
  npm run sales-orders [dateRange]  Export sales orders report
  
  npm run scheduled    Run reports based on today's schedule
  npm run daily        Export daily reports (dashboard, pipeline)
  npm run weekly       Export weekly reports (all three)
  npm run monthly      Export monthly reports (all three)
  npm run friday       Export all Friday reports (all periods)
  npm run all          Export all reports for all periods
  
  npm run cron         Start the scheduler (runs every day at 5 PM EST)

Date Ranges:
  Today, This Week, Last Week, This Month, Last Month, This Year, Last Year

Examples:
  npm run dashboard "This Week"
  npm run pipeline Today
  npm run sales-orders "Last Month"
  npm run scheduled
  npm run cron

Schedule:
  Runs every day at 5:00 PM EST
  Exports all three reports: Dashboard, Pipeline, and Sales Rep

Files are saved to: ${process.env.DOWNLOAD_DIR || 'C:\\Users\\Lawrence\\Downloads'}
File naming format: dash-monday-112025.csv (reporttype-dayofweek-MMYYYY.csv)
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
