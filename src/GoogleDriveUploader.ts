import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import logger from './logger';

export interface UploadOptions {
  remoteName?: string;
  remoteFolder?: string;
  organizationType?: 'single' | 'by-date' | 'by-type' | 'by-structure';
  transferCount?: number;
  maxAge?: string;
  showProgress?: boolean;
  dateRange?: string; // Used to determine current vs previous folder
}

export interface UploadResult {
  success: boolean;
  filesUploaded: number;
  bytesTransferred: number;
  errors: string[];
  duration: number;
}

export class GoogleDriveUploader {
  private remoteName: string;
  private remoteFolder: string;
  private rclonePath: string;

  // Google Drive folder IDs
  private currentDataFolderId: string = '1opWJ_3RsH65sQ8GYWhMkpB5jL9WaKyRM';
  private previousDataFolderId: string = '1EZdpKoVMCFBKbEfGMyxly3iZlrTjmcrm';

  constructor(
    remoteName: string = 'gdrive',
    remoteFolder: string = 'CommonSKU Reports'
  ) {
    this.remoteName = remoteName;
    this.remoteFolder = remoteFolder;
    this.rclonePath = this.findRclonePath();
  }

  /**
   * Determine if a date range is "current" or "previous" data
   * Current: Today, This Week, This Month, This Year
   * Previous: Last Week, Last Month, Last Year
   */
  private isPreviousData(dateRange?: string): boolean {
    if (!dateRange) return false;
    const lower = dateRange.toLowerCase();
    return lower.includes('last') || lower.includes('previous') || lower.includes('prev');
  }

  /**
   * Get the appropriate folder ID based on date range
   */
  private getFolderIdForDateRange(dateRange?: string): string {
    return this.isPreviousData(dateRange) ? this.previousDataFolderId : this.currentDataFolderId;
  }

  /**
   * Find rclone executable path
   */
  private findRclonePath(): string {
    // Check if rclone is in system PATH
    try {
      execSync('rclone version', { stdio: 'ignore' });
      return 'rclone';
    } catch {
      // Try common installation paths
      const commonPaths = [
        'C:\\Windows\\System32\\rclone.exe',
        'C:\\Program Files\\rclone\\rclone.exe',
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'rclone', 'rclone.exe'),
      ];

      for (const rclonePath of commonPaths) {
        if (fs.existsSync(rclonePath)) {
          return rclonePath;
        }
      }

      throw new Error('Rclone not found. Please install rclone and ensure it is in your PATH or installed in a standard location.');
    }
  }

  /**
   * Check if rclone is configured for the remote
   */
  async isConfigured(): Promise<boolean> {
    try {
      const output = execSync(`"${this.rclonePath}" listremotes`, { encoding: 'utf-8' });
      return output.includes(`${this.remoteName}:`);
    } catch (error) {
      logger.error('Failed to check rclone configuration:', error);
      return false;
    }
  }

  /**
   * Get remote folder path based on organization type
   */
  private getRemotePath(options: UploadOptions, filePath?: string): string {
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
          } else if (filename.startsWith('pipe-')) {
            return `${baseFolder}/Pipeline"`;
          } else if (filename.startsWith('sr-')) {
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
  async uploadFile(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
    const startTime = Date.now();
    const result: UploadResult = {
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

      logger.info(`Uploading ${filename} to Google Drive (${folderType})`);
      logger.debug(`Rclone command: ${this.rclonePath} ${args.join(' ')}`);

      const output = execSync(`"${this.rclonePath}" ${args.join(' ')}`, {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      logger.debug(`Rclone output: ${output}`);

      result.success = true;
      result.filesUploaded = 1;
      result.bytesTransferred = fs.statSync(filePath).size;
      logger.info(`Successfully uploaded: ${filename} to ${folderType}`);

    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error');
      logger.error(`Failed to upload file ${filePath}:`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Upload multiple files to Google Drive
   */
  async uploadFiles(filePaths: string[], options: UploadOptions = {}): Promise<UploadResult> {
    const startTime = Date.now();
    const result: UploadResult = {
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
      } else {
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
  async uploadDirectory(dirPath: string, options: UploadOptions = {}): Promise<UploadResult> {
    const startTime = Date.now();
    const result: UploadResult = {
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

      logger.info(`Uploading directory to Google Drive: ${dirPath}`);
      logger.debug(`Rclone command: ${this.rclonePath} ${args.join(' ')}`);

      const output = execSync(`"${this.rclonePath}" ${args.join(' ')}`, {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      logger.debug(`Rclone output: ${output}`);

      // Parse output to get file count (basic parsing)
      const transferredMatch = output.match(/Transferred:\s+(\d+)/);
      if (transferredMatch) {
        result.filesUploaded = parseInt(transferredMatch[1], 10);
      }

      const bytesMatch = output.match(/Transferred:\s+[\d.]+\s+[KMGT]?B\s+\/\s+([\d.]+)\s+([KMGT]?B)/);
      if (bytesMatch) {
        const size = parseFloat(bytesMatch[1]);
        const unit = bytesMatch[2];
        const multipliers: { [key: string]: number } = {
          'B': 1,
          'KB': 1024,
          'MB': 1024 * 1024,
          'GB': 1024 * 1024 * 1024,
          'TB': 1024 * 1024 * 1024 * 1024,
        };
        result.bytesTransferred = Math.round(size * (multipliers[unit] || 1));
      }

      result.success = true;
      logger.info(`Successfully uploaded directory: ${dirPath} to ${remotePath}`);

    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error');
      logger.error(`Failed to upload directory ${dirPath}:`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * List files in remote folder
   */
  async listRemoteFiles(subFolder?: string): Promise<string[]> {
    try {
      const remotePath = subFolder
        ? `${this.remoteName}:"${this.remoteFolder}/${subFolder}"`
        : `${this.remoteName}:"${this.remoteFolder}"`;

      const output = execSync(`"${this.rclonePath}" ls ${remotePath}`, {
        encoding: 'utf-8',
      });

      return output.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      logger.error('Failed to list remote files:', error);
      return [];
    }
  }

  /**
   * Get remote storage info
   */
  async getRemoteInfo(): Promise<{ total: number; used: number; free: number } | null> {
    try {
      const output = execSync(`"${this.rclonePath}" about ${this.remoteName}:`, {
        encoding: 'utf-8',
      });

      // Parse the output (basic parsing)
      const totalMatch = output.match(/Total:\s+([\d.]+)\s+([KMGT]?B)/);
      const usedMatch = output.match(/Used:\s+([\d.]+)\s+([KMGT]?B)/);
      const freeMatch = output.match(/Free:\s+([\d.]+)\s+([KMGT]?B)/);

      const parseSize = (value: string, unit: string): number => {
        const size = parseFloat(value);
        const multipliers: { [key: string]: number } = {
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
    } catch (error) {
      logger.error('Failed to get remote info:', error);
      return null;
    }
  }
}

export default GoogleDriveUploader;
