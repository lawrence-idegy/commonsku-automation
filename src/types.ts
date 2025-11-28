export type ReportType = 'dashboard' | 'pipeline' | 'sales-orders';

export type DateRange = 
  | 'Today'
  | 'Yesterday'
  | 'This Week'
  | 'Last Week'
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'Last Quarter'
  | 'This Year'
  | 'Last Year';

export type DaySchedule = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'friday'
  | 'all';

export interface ReportResult {
  success: boolean;
  reportType: ReportType;
  fileName?: string;
  filePath?: string;
  error?: string;
  timestamp: Date;
}

export interface ScheduleConfig {
  enabled: boolean;
  cronExpression: string;
  reportType: ReportType;
  dateRange: DateRange;
}

export interface AllReportsResult {
  dashboard: string | null;
  pipeline: string | null;
  salesOrders: string | null;
}
