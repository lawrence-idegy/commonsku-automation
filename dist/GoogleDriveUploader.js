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
exports.GoogleDriveUploader = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = __importDefault(require("./logger"));
class GoogleDriveUploader {
    constructor(remoteName = 'gdrive', remoteFolder = 'CommonSKU Reports') {
        // Google Drive folder IDs
        this.currentDataFolderId = '1opWJ_3RsH65sQ8GYWhMkpB5jL9WaKyRM';
        this.previousDataFolderId = '1EZdpKoVMCFBKbEfGMyxly3iZlrTjmcrm';
        this.remoteName = remoteName;
        this.remoteFolder = remoteFolder;
        this.rclonePath = this.findRclonePath();
    }
    /**
     * Determine if a date range is "current" or "previous" data
     * Current: Today, This Week, This Month, This Year
     * Previous: Last Week, Last Month, Last Year
     */
    isPreviousData(dateRange) {
        if (!dateRange)
            return false;
        const lower = dateRange.toLowerCase();
        return lower.includes('last') || lower.includes('previous') || lower.includes('prev');
    }
    /**
     * Get the appropriate folder ID based on date range
     */
    getFolderIdForDateRange(dateRange) {
        return this.isPreviousData(dateRange) ? this.previousDataFolderId : this.currentDataFolderId;
    }
    /**
     * Find rclone executable path
     */
    findRclonePath() {
        // Check if rclone is in system PATH
        try {
            (0, child_process_1.execSync)('rclone version', { stdio: 'ignore' });
            return 'rclone';
        }
        catch {
            // Try common installation paths (including user-specific locations)
            const userProfile = process.env.USERPROFILE || process.env.HOME || '';
            const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
            const commonPaths = [
                // User-specific installation paths (most common for Windows installers)
                path.join(localAppData, 'Programs', 'rclone', 'rclone.exe'),
                path.join(userProfile, 'AppData', 'Local', 'Programs', 'rclone', 'rclone.exe'),
                path.join(userProfile, 'scoop', 'apps', 'rclone', 'current', 'rclone.exe'),
                // System-wide installation paths
                'C:\\Windows\\System32\\rclone.exe',
                'C:\\Program Files\\rclone\\rclone.exe',
                'C:\\Program Files (x86)\\rclone\\rclone.exe',
                path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'rclone', 'rclone.exe'),
                // Chocolatey installation path
                'C:\\ProgramData\\chocolatey\\bin\\rclone.exe',
            ];
            for (const rclonePath of commonPaths) {
                if (fs.existsSync(rclonePath)) {
                    logger_1.default.info(`Found rclone at: ${rclonePath}`);
                    return rclonePath;
                }
            }
            throw new Error('Rclone not found. Please install rclone and ensure it is in your PATH or installed in a standard location.');
        }
    }
    /**
     * Check if rclone is configured for the remote
     */
    async isConfigured() {
        try {
            const output = (0, child_process_1.execSync)(`"${this.rclonePath}" listremotes`, { encoding: 'utf-8' });
            return output.includes(`${this.remoteName}:`);
        }
        catch (error) {
            logger_1.default.error('Failed to check rclone configuration:', error);
            return false;
        }
    }
    /**
     * Get remote folder path based on organization type
     */
    getRemotePath(options, filePath) {
        const baseFolder = `${this.remoteName}:"${this.remoteFolder}`;
        switch (options.organizationType) {
            case 'by-date':
                const today = new Date();
                const dateFolder = today.toISOString().split('T')[0].replace(/-/g, '');
                return `${baseFolder}/${dateFolder}"`;
            case 'by-type':
                if (filePath) {
                    const filename = path.basename(filePath);
                    if (filename.startsWith('dash-')) {
                        return `${baseFolder}/Dashboard"`;
                    }
                    else if (filename.startsWith('pipe-')) {
                        return `${baseFolder}/Pipeline"`;
                    }
                    else if (filename.startsWith('sr-')) {
                        return `${baseFolder}/Sales Rep"`;
                    }
                }
                return `${baseFolder}"`;
            case 'by-structure':
                // Maintains local folder structure
                return `${baseFolder}"`;
            case 'single':
            default:
                return `${baseFolder}"`;
        }
    }
    /**
     * Upload a single file to Google Drive using folder ID
     */
    async uploadFile(filePath, options = {}) {
        const startTime = Date.now();
        const result = {
            success: false,
            filesUploaded: 0,
            bytesTransferred: 0,
            errors: [],
            duration: 0,
        };
        try {
            // Check if rclone is configured
            if (!(await this.isConfigured())) {
                throw new Error(`Rclone remote "${this.remoteName}" is not configured. Please run: rclone config`);
            }
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            // Determine target folder based on date range
            const folderId = this.getFolderIdForDateRange(options.dateRange);
            const folderType = this.isPreviousData(options.dateRange) ? 'Previous Data' : 'Current Data';
            const filename = path.basename(filePath);
            // Use folder ID directly with rclone: gdrive:,folder_id=FOLDER_ID/filename
            const remotePath = `${this.remoteName}:,folder_id=${folderId}/${filename}`;
            const args = ['copyto', filePath, remotePath];
            // Add optional parameters
            if (options.transferCount) {
                args.push('--transfers', options.transferCount.toString());
            }
            if (options.showProgress) {
                args.push('--progress');
            }
            // Add verbose logging
            args.push('--verbose');
            logger_1.default.info(`Uploading ${filename} to Google Drive (${folderType})`);
            logger_1.default.debug(`Rclone command: ${this.rclonePath} ${args.join(' ')}`);
            const output = (0, child_process_1.execSync)(`"${this.rclonePath}" ${args.join(' ')}`, {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            });
            logger_1.default.debug(`Rclone output: ${output}`);
            result.success = true;
            result.filesUploaded = 1;
            result.bytesTransferred = fs.statSync(filePath).size;
            logger_1.default.info(`Successfully uploaded: ${filename} to ${folderType}`);
        }
        catch (error) {
            result.errors.push(error.message || 'Unknown error');
            logger_1.default.error(`Failed to upload file ${filePath}:`, error);
        }
        result.duration = Date.now() - startTime;
        return result;
    }
    /**
     * Upload multiple files to Google Drive
     */
    async uploadFiles(filePaths, options = {}) {
        const startTime = Date.now();
        const result = {
            success: true,
            filesUploaded: 0,
            bytesTransferred: 0,
            errors: [],
            duration: 0,
        };
        for (const filePath of filePaths) {
            const fileResult = await this.uploadFile(filePath, options);
            if (fileResult.success) {
                result.filesUploaded += fileResult.filesUploaded;
                result.bytesTransferred += fileResult.bytesTransferred;
            }
            else {
                result.success = false;
                result.errors.push(...fileResult.errors);
            }
        }
        result.duration = Date.now() - startTime;
        return result;
    }
    /**
     * Upload entire directory to Google Drive
     */
    async uploadDirectory(dirPath, options = {}) {
        const startTime = Date.now();
        const result = {
            success: false,
            filesUploaded: 0,
            bytesTransferred: 0,
            errors: [],
            duration: 0,
        };
        try {
            // Check if rclone is configured
            if (!(await this.isConfigured())) {
                throw new Error(`Rclone remote "${this.remoteName}" is not configured. Please run: rclone config`);
            }
            // Check if directory exists
            if (!fs.existsSync(dirPath)) {
                throw new Error(`Directory not found: ${dirPath}`);
            }
            const remotePath = this.getRemotePath(options);
            const args = ['copy', dirPath, remotePath];
            // Add optional parameters
            if (options.transferCount) {
                args.push('--transfers', options.transferCount.toString());
            }
            if (options.maxAge) {
                args.push('--max-age', options.maxAge);
            }
            if (options.showProgress) {
                args.push('--progress');
            }
            // Add verbose logging and stats
            args.push('--verbose', '--stats', '1s');
            logger_1.default.info(`Uploading directory to Google Drive: ${dirPath}`);
            logger_1.default.debug(`Rclone command: ${this.rclonePath} ${args.join(' ')}`);
            const output = (0, child_process_1.execSync)(`"${this.rclonePath}" ${args.join(' ')}`, {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            });
            logger_1.default.debug(`Rclone output: ${output}`);
            // Parse output to get file count (basic parsing)
            const transferredMatch = output.match(/Transferred:\s+(\d+)/);
            if (transferredMatch) {
                result.filesUploaded = parseInt(transferredMatch[1], 10);
            }
            const bytesMatch = output.match(/Transferred:\s+[\d.]+\s+[KMGT]?B\s+\/\s+([\d.]+)\s+([KMGT]?B)/);
            if (bytesMatch) {
                const size = parseFloat(bytesMatch[1]);
                const unit = bytesMatch[2];
                const multipliers = {
                    'B': 1,
                    'KB': 1024,
                    'MB': 1024 * 1024,
                    'GB': 1024 * 1024 * 1024,
                    'TB': 1024 * 1024 * 1024 * 1024,
                };
                result.bytesTransferred = Math.round(size * (multipliers[unit] || 1));
            }
            result.success = true;
            logger_1.default.info(`Successfully uploaded directory: ${dirPath} to ${remotePath}`);
        }
        catch (error) {
            result.errors.push(error.message || 'Unknown error');
            logger_1.default.error(`Failed to upload directory ${dirPath}:`, error);
        }
        result.duration = Date.now() - startTime;
        return result;
    }
    /**
     * List files in remote folder
     */
    async listRemoteFiles(subFolder) {
        try {
            const remotePath = subFolder
                ? `${this.remoteName}:"${this.remoteFolder}/${subFolder}"`
                : `${this.remoteName}:"${this.remoteFolder}"`;
            const output = (0, child_process_1.execSync)(`"${this.rclonePath}" ls ${remotePath}`, {
                encoding: 'utf-8',
            });
            return output.split('\n').filter(line => line.trim().length > 0);
        }
        catch (error) {
            logger_1.default.error('Failed to list remote files:', error);
            return [];
        }
    }
    /**
     * Get remote storage info
     */
    async getRemoteInfo() {
        try {
            const output = (0, child_process_1.execSync)(`"${this.rclonePath}" about ${this.remoteName}:`, {
                encoding: 'utf-8',
            });
            // Parse the output (basic parsing)
            const totalMatch = output.match(/Total:\s+([\d.]+)\s+([KMGT]?B)/);
            const usedMatch = output.match(/Used:\s+([\d.]+)\s+([KMGT]?B)/);
            const freeMatch = output.match(/Free:\s+([\d.]+)\s+([KMGT]?B)/);
            const parseSize = (value, unit) => {
                const size = parseFloat(value);
                const multipliers = {
                    'B': 1,
                    'KB': 1024,
                    'MB': 1024 * 1024,
                    'GB': 1024 * 1024 * 1024,
                    'TB': 1024 * 1024 * 1024 * 1024,
                };
                return Math.round(size * (multipliers[unit] || 1));
            };
            return {
                total: totalMatch ? parseSize(totalMatch[1], totalMatch[2]) : 0,
                used: usedMatch ? parseSize(usedMatch[1], usedMatch[2]) : 0,
                free: freeMatch ? parseSize(freeMatch[1], freeMatch[2]) : 0,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get remote info:', error);
            return null;
        }
    }
}
exports.GoogleDriveUploader = GoogleDriveUploader;
exports.default = GoogleDriveUploader;
