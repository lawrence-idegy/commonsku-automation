import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';

export interface ReportTask {
  id: string;
  type: 'dashboard' | 'pipeline' | 'sales-orders';
  dateRange: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  filePath?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
}

export interface BatchState {
  batchId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  tasks: ReportTask[];
}

export class StateManager {
  private stateFilePath: string;
  private currentBatch: BatchState | null = null;

  constructor(stateDir: string = './state') {
    // Ensure state directory exists
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    this.stateFilePath = path.join(stateDir, 'batch-state.json');
  }

  /**
   * Create a new batch with tasks
   */
  createBatch(tasks: Array<{ type: ReportTask['type']; dateRange: string }>): string {
    const batchId = `batch_${Date.now()}`;

    this.currentBatch = {
      batchId,
      startTime: new Date(),
      status: 'running',
      tasks: tasks.map((task, index) => ({
        id: `task_${batchId}_${index}`,
        type: task.type,
        dateRange: task.dateRange,
        status: 'pending',
        retryCount: 0
      }))
    };

    this.saveBatch();
    logger.info(`Created new batch: ${batchId} with ${tasks.length} tasks`);
    return batchId;
  }

  /**
   * Load an existing batch from file
   */
  loadBatch(batchId?: string): BatchState | null {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return null;
      }

      const data = fs.readFileSync(this.stateFilePath, 'utf-8');
      const batch: BatchState = JSON.parse(data);

      // Convert date strings back to Date objects
      batch.startTime = new Date(batch.startTime);
      if (batch.endTime) {
        batch.endTime = new Date(batch.endTime);
      }

      batch.tasks.forEach(task => {
        if (task.startTime) task.startTime = new Date(task.startTime);
        if (task.endTime) task.endTime = new Date(task.endTime);
      });

      if (batchId && batch.batchId !== batchId) {
        logger.warn(`Requested batch ${batchId} not found, loaded ${batch.batchId}`);
      }

      this.currentBatch = batch;
      logger.info(`Loaded batch: ${batch.batchId}`);
      return batch;
    } catch (error) {
      logger.error('Failed to load batch state:', error);
      return null;
    }
  }

  /**
   * Save current batch to file
   */
  saveBatch(): void {
    if (!this.currentBatch) {
      logger.warn('No current batch to save');
      return;
    }

    try {
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(this.currentBatch, null, 2),
        'utf-8'
      );
      logger.debug('Batch state saved');
    } catch (error) {
      logger.error('Failed to save batch state:', error);
    }
  }

  /**
   * Update a task's status
   */
  updateTask(taskId: string, updates: Partial<ReportTask>): void {
    if (!this.currentBatch) {
      logger.warn('No current batch to update');
      return;
    }

    const task = this.currentBatch.tasks.find(t => t.id === taskId);
    if (!task) {
      logger.warn(`Task ${taskId} not found in current batch`);
      return;
    }

    Object.assign(task, updates);

    if (updates.status === 'in_progress' && !task.startTime) {
      task.startTime = new Date();
    } else if ((updates.status === 'completed' || updates.status === 'failed') && !task.endTime) {
      task.endTime = new Date();
    }

    this.saveBatch();
    logger.info(`Updated task ${taskId}: ${updates.status}`);
  }

  /**
   * Get pending tasks (not completed)
   */
  getPendingTasks(): ReportTask[] {
    if (!this.currentBatch) {
      return [];
    }

    return this.currentBatch.tasks.filter(
      task => task.status === 'pending' || task.status === 'failed'
    );
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): ReportTask[] {
    if (!this.currentBatch) {
      return [];
    }

    return this.currentBatch.tasks.filter(task => task.status === 'completed');
  }

  /**
   * Check if a specific report already exists
   */
  isReportCompleted(type: string, dateRange: string): boolean {
    if (!this.currentBatch) {
      return false;
    }

    return this.currentBatch.tasks.some(
      task => task.type === type &&
              task.dateRange === dateRange &&
              task.status === 'completed'
    );
  }

  /**
   * Mark batch as completed
   */
  completeBatch(): void {
    if (!this.currentBatch) {
      return;
    }

    this.currentBatch.endTime = new Date();
    this.currentBatch.status = 'completed';
    this.saveBatch();
    logger.info(`Batch ${this.currentBatch.batchId} completed`);
  }

  /**
   * Mark batch as failed
   */
  failBatch(error?: string): void {
    if (!this.currentBatch) {
      return;
    }

    this.currentBatch.endTime = new Date();
    this.currentBatch.status = 'failed';
    this.saveBatch();
    logger.error(`Batch ${this.currentBatch.batchId} failed: ${error || 'Unknown error'}`);
  }

  /**
   * Get current batch
   */
  getCurrentBatch(): BatchState | null {
    return this.currentBatch;
  }

  /**
   * Get batch progress summary
   */
  getProgress(): { total: number; completed: number; failed: number; pending: number; in_progress: number } {
    if (!this.currentBatch) {
      return { total: 0, completed: 0, failed: 0, pending: 0, in_progress: 0 };
    }

    const tasks = this.currentBatch.tasks;
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length
    };
  }

  /**
   * Clear state file (for cleanup)
   */
  clearState(): void {
    if (fs.existsSync(this.stateFilePath)) {
      fs.unlinkSync(this.stateFilePath);
      logger.info('State file cleared');
    }
    this.currentBatch = null;
  }
}

export default StateManager;
