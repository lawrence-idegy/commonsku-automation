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
   * NEW schedule - SR (Sales Rep) reports ONLY:
   * - Daily (Mon-Thu): Download SR daily report (Today)
   * - Friday: Download SR for all periods (Today, This Week, Last Week, This Month, Last Month, This Year)
   */
  getScheduleForToday(): DaySchedule {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch(today) {
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
  async runScheduledReports(schedule: DaySchedule): Promise<void> {
    await this.automation.initialize();
    await this.automation.login();

    try {
      switch(schedule) {
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

  // ========================================
  // NEW: SR-Only Report Methods (Sales Rep Reports Only)
  // ========================================

  /**
   * Run SR (Sales Rep) daily report only - Today
   */
  private async runSRDailyReports(): Promise<void> {
    logger.info('Running SR daily report (Sales Rep - Today only)...');
    await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport('Today'); }, 'SR-Today');
  }

  /**
   * Run SR (Sales Rep) weekly report only - This Week
   */
  private async runSRWeeklyReports(): Promise<void> {
    logger.info('Running SR weekly report (Sales Rep - This Week only)...');
    await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport('This Week'); }, 'SR-This Week');
  }

  /**
   * Run SR (Sales Rep) Friday comprehensive batch
   * Downloads SR reports for all periods: Today, This Week, Last Week, This Month, Last Month, This Year
   */
  private async runSRFridayReports(): Promise<void> {
    logger.info('Running SR Friday reports (Sales Rep - all periods)...');

    const periods: DateRange[] = [
      'Today',           // Daily
      'This Week',       // Weekly
      'Last Week',       // Previous week
      'This Month',      // Monthly
      'Last Month',      // Previous month
      'This Year'        // YTD
    ];

    for (const period of periods) {
      logger.info(`Generating SR ${period} report...`);
      await this.runWithRetry(async () => { await this.automation.exportSalesOrdersReport(period); }, `SR-${period}`);
    }

    logger.info('SR Friday reports completed - 6 Sales Rep reports generated');
  }

  /**
   * Retry wrapper for flaky exports
   * Retries up to 3 times with exponential backoff
   */
  private async runWithRetry(
    fn: () => Promise<void>,
    reportName: string,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fn();
        if (attempt > 1) {
          logger.info(`${reportName} succeeded on attempt ${attempt}`);
        }
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`${reportName} failed on attempt ${attempt}/${maxRetries}: ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = attempt * 5000; // 5s, 10s, 15s
          logger.info(`Retrying ${reportName} in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`${reportName} failed after ${maxRetries} attempts`);
    throw lastError;
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
