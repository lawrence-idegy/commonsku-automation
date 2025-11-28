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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("./logger"));
class StateManager {
    constructor(stateDir = './state') {
        this.currentBatch = null;
        // Ensure state directory exists
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        this.stateFilePath = path.join(stateDir, 'batch-state.json');
    }
    /**
     * Create a new batch with tasks
     */
    createBatch(tasks) {
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
        logger_1.default.info(`Created new batch: ${batchId} with ${tasks.length} tasks`);
        return batchId;
    }
    /**
     * Load an existing batch from file
     */
    loadBatch(batchId) {
        try {
            if (!fs.existsSync(this.stateFilePath)) {
                return null;
            }
            const data = fs.readFileSync(this.stateFilePath, 'utf-8');
            const batch = JSON.parse(data);
            // Convert date strings back to Date objects
            batch.startTime = new Date(batch.startTime);
            if (batch.endTime) {
                batch.endTime = new Date(batch.endTime);
            }
            batch.tasks.forEach(task => {
                if (task.startTime)
                    task.startTime = new Date(task.startTime);
                if (task.endTime)
                    task.endTime = new Date(task.endTime);
            });
            if (batchId && batch.batchId !== batchId) {
                logger_1.default.warn(`Requested batch ${batchId} not found, loaded ${batch.batchId}`);
            }
            this.currentBatch = batch;
            logger_1.default.info(`Loaded batch: ${batch.batchId}`);
            return batch;
        }
        catch (error) {
            logger_1.default.error('Failed to load batch state:', error);
            return null;
        }
    }
    /**
     * Save current batch to file
     */
    saveBatch() {
        if (!this.currentBatch) {
            logger_1.default.warn('No current batch to save');
            return;
        }
        try {
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.currentBatch, null, 2), 'utf-8');
            logger_1.default.debug('Batch state saved');
        }
        catch (error) {
            logger_1.default.error('Failed to save batch state:', error);
        }
    }
    /**
     * Update a task's status
     */
    updateTask(taskId, updates) {
        if (!this.currentBatch) {
            logger_1.default.warn('No current batch to update');
            return;
        }
        const task = this.currentBatch.tasks.find(t => t.id === taskId);
        if (!task) {
            logger_1.default.warn(`Task ${taskId} not found in current batch`);
            return;
        }
        Object.assign(task, updates);
        if (updates.status === 'in_progress' && !task.startTime) {
            task.startTime = new Date();
        }
        else if ((updates.status === 'completed' || updates.status === 'failed') && !task.endTime) {
            task.endTime = new Date();
        }
        this.saveBatch();
        logger_1.default.info(`Updated task ${taskId}: ${updates.status}`);
    }
    /**
     * Get pending tasks (not completed)
     */
    getPendingTasks() {
        if (!this.currentBatch) {
            return [];
        }
        return this.currentBatch.tasks.filter(task => task.status === 'pending' || task.status === 'failed');
    }
    /**
     * Get completed tasks
     */
    getCompletedTasks() {
        if (!this.currentBatch) {
            return [];
        }
        return this.currentBatch.tasks.filter(task => task.status === 'completed');
    }
    /**
     * Check if a specific report already exists
     */
    isReportCompleted(type, dateRange) {
        if (!this.currentBatch) {
            return false;
        }
        return this.currentBatch.tasks.some(task => task.type === type &&
            task.dateRange === dateRange &&
            task.status === 'completed');
    }
    /**
     * Mark batch as completed
     */
    completeBatch() {
        if (!this.currentBatch) {
            return;
        }
        this.currentBatch.endTime = new Date();
        this.currentBatch.status = 'completed';
        this.saveBatch();
        logger_1.default.info(`Batch ${this.currentBatch.batchId} completed`);
    }
    /**
     * Mark batch as failed
     */
    failBatch(error) {
        if (!this.currentBatch) {
            return;
        }
        this.currentBatch.endTime = new Date();
        this.currentBatch.status = 'failed';
        this.saveBatch();
        logger_1.default.error(`Batch ${this.currentBatch.batchId} failed: ${error || 'Unknown error'}`);
    }
    /**
     * Get current batch
     */
    getCurrentBatch() {
        return this.currentBatch;
    }
    /**
     * Get batch progress summary
     */
    getProgress() {
        if (!this.currentBatch) {
            return { total: 0, completed: 0, failed: 0, pending: 0 };
        }
        const tasks = this.currentBatch.tasks;
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
        };
    }
    /**
     * Clear state file (for cleanup)
     */
    clearState() {
        if (fs.existsSync(this.stateFilePath)) {
            fs.unlinkSync(this.stateFilePath);
            logger_1.default.info('State file cleared');
        }
        this.currentBatch = null;
    }
}
exports.StateManager = StateManager;
exports.default = StateManager;
