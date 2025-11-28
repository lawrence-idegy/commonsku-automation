import * as dotenv from 'dotenv';
import { CommonSKUAutomation } from './automation';
import { ReportScheduler } from './scheduler';
import { logger } from './logger';
import { DateRange } from './types';

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const scheduler = new ReportScheduler();
  const automation = new CommonSKUAutomation();

  try {
    switch(command) {
      case 'dashboard':
        const dashboardDate = (args[1] as DateRange) || 'Today';
        await automation.initialize();
        await automation.login();
        await automation.exportDashboardReport(dashboardDate);
        await automation.cleanup();
        break;
      
      case 'pipeline':
        const pipelineDate = (args[1] as DateRange) || 'Today';
        await automation.initialize();
        await automation.login();
        await automation.exportPipelineReport(pipelineDate);
        await automation.cleanup();
        break;
      
      case 'sales-orders':
        const salesDate = (args[1] as DateRange) || 'This Week';
        await automation.initialize();
        await automation.login();
        await automation.exportSalesOrdersReport(salesDate);
        await automation.cleanup();
        break;
      
      case 'scheduled':
        // Run based on today's schedule
        const schedule = scheduler.getScheduleForToday();
        logger.info(`Running scheduled reports for: ${schedule}`);
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
      logger.info('Process completed successfully');
      process.exit(0);
    }
  } catch (error) {
    logger.error('Fatal error occurred', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  logger.error('Unhandled error in main', error);
  process.exit(1);
});
