import * as cron from 'node-cron';
import { CommonSKUAutomation } from './automation';
import { logger } from './logger';
import { DateRange, DaySchedule } from './types';

export class ReportScheduler {
  private automation: CommonSKUAutomation;
  
  constructor() {
    this.automation = new CommonSKUAutomation();
  }

  /**
   * Determine what reports to run based on the day of week
   * Schedule:
   * - Mon, Tue, Thu: Daily reports + sr-weekly
   * - Wednesday: Daily + sr-weekly + monthly (This Month & Last Month)
   * - Friday: Daily + sr-weekly + weekly + previous week + monthly + previous month + YTD
   */
  getScheduleForToday(): DaySchedule {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch(today) {
      case 1: // Monday
      case 2: // Tuesday
      case 4: // Thursday
        return 'daily';

      case 3: // Wednesday
        return 'monthly';

      case 5: // Friday
        return 'friday';

      default: // Weekend fallback
        return 'daily';
    }
  }

  /**
   * Run reports based on schedule type
   */
  async runScheduledReports(schedule: DaySchedule): Promise<void> {
    await this.automation.initialize();
    await this.automation.login();

    try {
      switch(schedule) {
        case 'daily':
          await this.runDailyReports();
          break;

        case 'friday':
          await this.runFridayReports();
          break;

        case 'weekly':
          await this.runWeeklyReports();
          break;

        case 'monthly':
          await this.runMonthlyReports();
          break;

        case 'all':
          await this.runAllReports();
          break;
      }
    } finally {
      await this.automation.cleanup();
    }
  }

  private async runDailyReports(): Promise<void> {
    logger.info('Running daily reports...');

    // Dashboard - Today
    await this.automation.exportDashboardReport('Today');

    // Pipeline - Today
    await this.automation.exportPipelineReport('Today');

    // Sales Rep - Today
    await this.automation.exportSalesOrdersReport('Today');

    // Sales Rep - This Week (sr-weekly)
    await this.automation.exportSalesOrdersReport('This Week');
  }

  private async runWeeklyReports(): Promise<void> {
    logger.info('Running weekly reports...');
    
    // Dashboard - This Week
    await this.automation.exportDashboardReport('This Week');
    
    // Pipeline - This Week
    await this.automation.exportPipelineReport('This Week');
    
    // Sales Orders - This Week
    await this.automation.exportSalesOrdersReport('This Week');
  }

  private async runMonthlyReports(): Promise<void> {
    logger.info('Running monthly reports (Wednesday)...');

    // On Wednesdays, download daily + sr-weekly + monthly reports
    // Daily reports
    await this.automation.exportDashboardReport('Today');
    await this.automation.exportPipelineReport('Today');
    await this.automation.exportSalesOrdersReport('Today');

    // Sales Rep - This Week (sr-weekly)
    await this.automation.exportSalesOrdersReport('This Week');

    // Monthly reports - This Month & Last Month
    await this.automation.exportDashboardReport('This Month');
    await this.automation.exportDashboardReport('Last Month');

    await this.automation.exportPipelineReport('This Month');
    await this.automation.exportPipelineReport('Last Month');

    await this.automation.exportSalesOrdersReport('This Month');
    await this.automation.exportSalesOrdersReport('Last Month');
  }

  private async runFridayReports(): Promise<void> {
    logger.info('Running Friday reports (comprehensive batch)...');

    // Friday: Daily reports + sr-weekly + weekly + previous week + monthly + previous month + YTD

    // 1. Daily reports (same as Mon-Thu)
    logger.info('Generating daily reports (Today)...');
    await this.automation.exportDashboardReport('Today');
    await this.automation.exportPipelineReport('Today');
    await this.automation.exportSalesOrdersReport('Today');
    await this.automation.exportSalesOrdersReport('This Week'); // sr-weekly

    // 2. Weekly reports (all 3)
    logger.info('Generating weekly reports (This Week)...');
    await this.automation.exportDashboardReport('This Week');
    await this.automation.exportPipelineReport('This Week');

    // 3. Previous week reports (all 3)
    logger.info('Generating previous week reports (Last Week)...');
    await this.automation.exportDashboardReport('Last Week');
    await this.automation.exportPipelineReport('Last Week');
    await this.automation.exportSalesOrdersReport('Last Week');

    // 4. Monthly reports (all 3)
    logger.info('Generating monthly reports (This Month)...');
    await this.automation.exportDashboardReport('This Month');
    await this.automation.exportPipelineReport('This Month');
    await this.automation.exportSalesOrdersReport('This Month');

    // 5. Previous month reports (all 3)
    logger.info('Generating previous month reports (Last Month)...');
    await this.automation.exportDashboardReport('Last Month');
    await this.automation.exportPipelineReport('Last Month');
    await this.automation.exportSalesOrdersReport('Last Month');

    // 6. YTD reports (all 3)
    logger.info('Generating YTD reports (This Year)...');
    await this.automation.exportDashboardReport('This Year');
    await this.automation.exportPipelineReport('This Year');
    await this.automation.exportSalesOrdersReport('This Year');
  }

  private async runAllReports(): Promise<void> {
    logger.info('Running all reports...');
    await this.runFridayReports(); // Friday includes everything
  }

  /**
   * Start the cron scheduler
   */
  startScheduler(): void {
    // Run every day at 5:00 PM EST (17:00)
    cron.schedule('0 17 * * *', async () => {
      logger.info('Starting scheduled report export...');

      try {
        // Run daily reports every day
        await this.runDailyReports();
        logger.info('Scheduled reports completed successfully');
      } catch (error) {
        logger.error('Scheduled reports failed', error);
      }
    }, {
      timezone: "America/New_York"
    });

    logger.info('Report scheduler started - runs every day at 5:00 PM EST');

    // Keep the process running
    process.stdin.resume();
  }

  /**
   * Run a specific report type on demand
   */
  async runSpecificReport(reportType: string, dateRange: DateRange): Promise<void> {
    await this.automation.initialize();
    await this.automation.login();

    try {
      switch(reportType) {
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
    } finally {
      await this.automation.cleanup();
    }
  }
}
