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
exports.CommonSKUAutomation = void 0;
const CommonSKUAutomation_1 = require("./CommonSKUAutomation");
const logger_1 = require("./logger");
const path = __importStar(require("path"));
// Use composition instead of inheritance to avoid signature conflicts
class CommonSKUAutomation {
    constructor() {
        this.automation = new CommonSKUAutomation_1.CommonSKUAutomation();
    }
    async initialize() {
        return this.automation.initialize();
    }
    async login() {
        return this.automation.login();
    }
    async cleanup() {
        return this.automation.cleanup();
    }
    async exportDashboardReport(dateRange = 'Today') {
        const result = await this.automation.exportDashboardReport(dateRange);
        return {
            success: result !== null,
            reportType: 'dashboard',
            fileName: result ? path.basename(result) : undefined,
            filePath: result || undefined,
            timestamp: new Date(),
            error: result ? undefined : 'Failed to export report'
        };
    }
    async exportPipelineReport(dateRange = 'Today') {
        const result = await this.automation.exportPipelineReport(dateRange);
        return {
            success: result !== null,
            reportType: 'pipeline',
            fileName: result ? path.basename(result) : undefined,
            filePath: result || undefined,
            timestamp: new Date(),
            error: result ? undefined : 'Failed to export report'
        };
    }
    async exportSalesOrdersReport(dateRange = 'This Week') {
        const result = await this.automation.exportSalesOrdersReport(dateRange);
        return {
            success: result !== null,
            reportType: 'sales-orders',
            fileName: result ? path.basename(result) : undefined,
            filePath: result || undefined,
            timestamp: new Date(),
            error: result ? undefined : 'Failed to export report'
        };
    }
    async exportReport(reportType, dateRange = 'Today') {
        let result = null;
        switch (reportType) {
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
                logger_1.logger.error(`Unknown report type: ${reportType}`);
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
    async exportAllReports() {
        const results = await this.automation.exportAllReports();
        const formattedResults = [];
        if (results.dashboard) {
            formattedResults.push({
                success: true,
                reportType: 'dashboard',
                fileName: path.basename(results.dashboard),
                filePath: results.dashboard,
                timestamp: new Date()
            });
        }
        else {
            formattedResults.push({
                success: false,
                reportType: 'dashboard',
                error: 'Failed to export dashboard report',
                timestamp: new Date()
            });
        }
        if (results.pipeline) {
            formattedResults.push({
                success: true,
                reportType: 'pipeline',
                fileName: path.basename(results.pipeline),
                filePath: results.pipeline,
                timestamp: new Date()
            });
        }
        else {
            formattedResults.push({
                success: false,
                reportType: 'pipeline',
                error: 'Failed to export pipeline report',
                timestamp: new Date()
            });
        }
        if (results.salesOrders) {
            formattedResults.push({
                success: true,
                reportType: 'sales-orders',
                fileName: path.basename(results.salesOrders),
                filePath: results.salesOrders,
                timestamp: new Date()
            });
        }
        else {
            formattedResults.push({
                success: false,
                reportType: 'sales-orders',
                error: 'Failed to export sales orders report',
                timestamp: new Date()
            });
        }
        return formattedResults;
    }
    // Method to get raw results if needed
    async exportAllReportsRaw() {
        return await this.automation.exportAllReports();
    }
}
exports.CommonSKUAutomation = CommonSKUAutomation;
