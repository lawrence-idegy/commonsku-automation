"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'commonsku-automation' },
    transports: [
        // Write all logs to file
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log')
        })
    ]
});
// If not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
// Export helper functions
const logInfo = (message, meta) => exports.logger.info(message, meta);
exports.logInfo = logInfo;
const logError = (message, error) => exports.logger.error(message, { error: error?.message || error });
exports.logError = logError;
const logWarn = (message, meta) => exports.logger.warn(message, meta);
exports.logWarn = logWarn;
const logDebug = (message, meta) => exports.logger.debug(message, meta);
exports.logDebug = logDebug;
// Default export
exports.default = exports.logger;
