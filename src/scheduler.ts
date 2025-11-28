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
   * New schedule:
   * - Daily (Mon-Thu): Download daily reports
   * - Wednesday: Also download monthly reports
   * - Friday: Download daily, weekly, previous week, monthly, previous month, and YTD
   */
  getScheduleForToday(): DaySchedule {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch(today) {
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
  async runScheduledReports(schedule: DaySchedule): Promise<void> {
    await this.automation.initialize();
    await this.automation.login();

    try {
      switch(schedule) {
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

  private async runFridayReports(): Promise<void> {
    logger.info('Running Friday reports (comprehensive batch)...');

    // Friday: Download daily, weekly, previous week, monthly, previous month, and YTD
    const periods: DateRange[] = [
      'Today',           // Daily
      'This Week',       // Weekly
      'Last Week',       // Previous week
      'This Month',      // Monthly
      'Last Month',      // Previous month
      'This Year'        // YTD
    ];

    for (const period of periods) {
      logger.info(`Generating ${period} reports...`);
      await this.automation.exportDashboardReport(period);
      await this.automation.exportPipelineReport(period);
      await this.automation.exportSalesOrdersReport(period);
    }
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
