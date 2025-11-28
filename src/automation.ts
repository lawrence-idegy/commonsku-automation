import { CommonSKUAutomation as CommonSKUAutomationBase } from './CommonSKUAutomation';
import { logger } from './logger';
import { ReportType, DateRange, ReportResult } from './types';
import * as path from 'path';

// Use composition instead of inheritance to avoid signature conflicts
export class CommonSKUAutomation {
  private automation: CommonSKUAutomationBase;
  
  constructor() {
    this.automation = new CommonSKUAutomationBase();
  }
  
  async initialize(): Promise<void> {
    return this.automation.initialize();
  }
  
  async login(): Promise<boolean> {
    return this.automation.login();
  }
  
  async cleanup(): Promise<void> {
    return this.automation.cleanup();
  }
  
  async exportDashboardReport(dateRange: DateRange = 'Today'): Promise<ReportResult> {
    const result = await this.automation.exportDashboardReport(dateRange);
    return {
      success: result !== null,
      reportType: 'dashboard' as ReportType,
      fileName: result ? path.basename(result) : undefined,
      filePath: result || undefined,
      timestamp: new Date(),
      error: result ? undefined : 'Failed to export report'
    };
  }
  
  async exportPipelineReport(dateRange: DateRange = 'Today'): Promise<ReportResult> {
    const result = await this.automation.exportPipelineReport(dateRange);
    return {
      success: result !== null,
      reportType: 'pipeline' as ReportType,
      fileName: result ? path.basename(result) : undefined,
      filePath: result || undefined,
      timestamp: new Date(),
      error: result ? undefined : 'Failed to export report'
    };
  }
  
  async exportSalesOrdersReport(dateRange: DateRange = 'This Week'): Promise<ReportResult> {
    const result = await this.automation.exportSalesOrdersReport(dateRange);
    return {
      success: result !== null,
      reportType: 'sales-orders' as ReportType,
      fileName: result ? path.basename(result) : undefined,
      filePath: result || undefined,
      timestamp: new Date(),
      error: result ? undefined : 'Failed to export report'
    };
  }
  
  async exportReport(reportType: ReportType, dateRange: DateRange = 'Today'): Promise<ReportResult> {
    let result: string | null = null;
    
    switch(reportType) {
      case 'dashboard':
        result = await this.automation.exportDashboardReport(dateRange);
        break;
      case 'pipeline':
        result = await this.automation.exportPipelineReport(dateRange);
        break;
      case 'sales-orders':
        result = await this.automation.exportSalesOrdersReport(dateRange);
        break;
      default:
        logger.error(`Unknown report type: ${reportType}`);
    }
    
    return {
      success: result !== null,
      reportType,
      fileName: result ? path.basename(result) : undefined,
      filePath: result || undefined,
      timestamp: new Date(),
      error: result ? undefined : 'Failed to export report'
    };
  }
  
  async exportAllReports(): Promise<ReportResult[]> {
    const results = await this.automation.exportAllReports();
    const formattedResults: ReportResult[] = [];
    
    if (results.dashboard) {
      formattedResults.push({
        success: true,
        reportType: 'dashboard' as ReportType,
        fileName: path.basename(results.dashboard),
        filePath: results.dashboard,
        timestamp: new Date()
      });
    } else {
      formattedResults.push({
        success: false,
        reportType: 'dashboard' as ReportType,
        error: 'Failed to export dashboard report',
        timestamp: new Date()
      });
    }
    
    if (results.pipeline) {
      formattedResults.push({
        success: true,
        reportType: 'pipeline' as ReportType,
        fileName: path.basename(results.pipeline),
        filePath: results.pipeline,
        timestamp: new Date()
      });
    } else {
      formattedResults.push({
        success: false,
        reportType: 'pipeline' as ReportType,
        error: 'Failed to export pipeline report',
        timestamp: new Date()
      });
    }
    
    if (results.salesOrders) {
      formattedResults.push({
        success: true,
        reportType: 'sales-orders' as ReportType,
        fileName: path.basename(results.salesOrders),
        filePath: results.salesOrders,
        timestamp: new Date()
      });
    } else {
      formattedResults.push({
        success: false,
        reportType: 'sales-orders' as ReportType,
        error: 'Failed to export sales orders report',
        timestamp: new Date()
      });
    }
    
    return formattedResults;
  }
  
  // Method to get raw results if needed
  async exportAllReportsRaw(): Promise<{ dashboard: string | null; pipeline: string | null; salesOrders: string | null }> {
    return await this.automation.exportAllReports();
  }
}
