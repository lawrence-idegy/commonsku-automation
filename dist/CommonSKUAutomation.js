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
exports.CommonSKUAutomation = void 0;
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./logger"));
const GoogleDriveUploader_1 = __importDefault(require("./GoogleDriveUploader"));
class CommonSKUAutomation {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.maxRetries = config_1.default.retry.maxRetries;
        this.retryDelay = config_1.default.retry.retryDelay;
        this.sessionFilePath = path.join(process.cwd(), 'state', 'browser-session.json');
        this.googleDriveUploader = null;
        logger_1.default.info('CommonSKU Automation initialized');
        // Ensure download directory exists
        if (!fs.existsSync(config_1.default.browser.downloadPath)) {
            fs.mkdirSync(config_1.default.browser.downloadPath, { recursive: true });
            logger_1.default.info(`Created download directory: ${config_1.default.browser.downloadPath}`);
        }
        // Ensure state directory exists
        const stateDir = path.dirname(this.sessionFilePath);
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        // Initialize Google Drive uploader if enabled
        if (config_1.default.googleDrive.enabled) {
            try {
                this.googleDriveUploader = new GoogleDriveUploader_1.default(config_1.default.googleDrive.remoteName, config_1.default.googleDrive.remoteFolder);
                logger_1.default.info('Google Drive uploader initialized');
            }
            catch (error) {
                logger_1.default.warn('Failed to initialize Google Drive uploader. Uploads will be disabled.', error);
                this.googleDriveUploader = null;
            }
        }
    }
    /**
     * Save browser session (cookies and storage state)
     */
    async saveSession() {
        if (!this.context)
            return;
        try {
            const state = await this.context.storageState();
            fs.writeFileSync(this.sessionFilePath, JSON.stringify(state, null, 2));
            logger_1.default.debug('Browser session saved');
        }
        catch (error) {
            logger_1.default.error('Failed to save session:', error);
        }
    }
    /**
     * Load browser session (cookies and storage state)
     */
    async loadSession() {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                logger_1.default.info('Loading saved browser session');
                return true;
            }
        }
        catch (error) {
            logger_1.default.error('Failed to load session:', error);
        }
        return false;
    }
    /**
     * Check if currently logged in
     */
    async isLoggedIn() {
        if (!this.page)
            return false;
        try {
            const url = this.page.url();
            // If we're on a report page or dashboard, we're logged in
            if (url.includes('/report') || url.includes('/dashboard') || url.includes('/management_dashboard')) {
                logger_1.default.debug('Session is active');
                return true;
            }
            // Try to navigate to a protected page
            await this.page.goto(`${config_1.default.commonsku.baseUrl}/report/sales-dashboard`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            await this.page.waitForTimeout(2000);
            const newUrl = this.page.url();
            const loggedIn = !newUrl.includes('/login') && !newUrl.includes('/signin');
            logger_1.default.debug(`Session check: ${loggedIn ? 'active' : 'expired'}`);
            return loggedIn;
        }
        catch (error) {
            logger_1.default.debug('Session check failed:', error);
            return false;
        }
    }
    /**
     * Ensure logged in - check session and re-login if needed
     */
    async ensureLoggedIn() {
        const loggedIn = await this.isLoggedIn();
        if (loggedIn) {
            logger_1.default.info('Session is still active');
            return true;
        }
        logger_1.default.warn('Session expired, attempting to re-login');
        const loginSuccess = await this.login();
        if (loginSuccess) {
            logger_1.default.info('Successfully re-logged in after session expiry');
            return true;
        }
        logger_1.default.error('Failed to re-login after session expiry');
        return false;
    }
    /**
     * Upload file to Google Drive if enabled
     * @param filePath - Path to the file to upload
     * @param dateRange - Date range used to determine current vs previous folder
     */
    async uploadToGoogleDrive(filePath, dateRange) {
        if (!filePath) {
            logger_1.default.debug('No file to upload (filePath is null)');
            return;
        }
        if (!config_1.default.googleDrive.enabled) {
            logger_1.default.debug('Google Drive upload is disabled');
            return;
        }
        if (!this.googleDriveUploader) {
            logger_1.default.warn('Google Drive uploader not initialized');
            return;
        }
        if (!config_1.default.googleDrive.uploadAfterEachReport) {
            logger_1.default.debug('Upload after each report is disabled');
            return;
        }
        try {
            logger_1.default.info(`Uploading to Google Drive: ${path.basename(filePath)}`);
            const result = await this.googleDriveUploader.uploadFile(filePath, {
                organizationType: config_1.default.googleDrive.organizationType,
                transferCount: config_1.default.googleDrive.transferCount,
                showProgress: config_1.default.googleDrive.showProgress,
                dateRange: dateRange, // Pass dateRange to determine folder
            });
            if (result.success) {
                logger_1.default.info(`Successfully uploaded ${path.basename(filePath)} to Google Drive (${result.bytesTransferred} bytes in ${result.duration}ms)`);
            }
            else {
                logger_1.default.error(`Failed to upload ${path.basename(filePath)} to Google Drive:`, result.errors.join(', '));
            }
        }
        catch (error) {
            logger_1.default.error('Error during Google Drive upload:', error);
        }
    }
    /**
     * Get folder path based on date range
     */
    getFolderForDateRange(dateRange) {
        const baseDir = config_1.default.browser.downloadPath;
        switch (dateRange.toLowerCase()) {
            case 'this week':
                return path.join(baseDir, 'current-week');
            case 'last week':
                return path.join(baseDir, 'previous-week');
            case 'this month':
                return path.join(baseDir, 'current-month');
            case 'last month':
                return path.join(baseDir, 'previous-month');
            case 'this year':
            case 'ytd':
                return path.join(baseDir, 'ytd');
            case 'today':
            case 'yesterday':
            default:
                return baseDir; // Root folder for today/yesterday
        }
    }
    /**
     * Generate custom filename format based on date range
     * Returns object with two filenames for redundancy
     * Examples:
     *   - Weekly: { primary: 'dash-weekly-112025.csv', secondary: 'dash-current-week-112025.csv' }
     *   - Monthly: { primary: 'dash-monthly-112025.csv', secondary: 'dash-current-month-112025.csv' }
     *   - Daily: { primary: 'dash-monday-112025.csv', secondary: 'dash-daily-112025.csv' }
     */
    getCustomFilenames(reportType, dateRange) {
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = days[now.getDay()];
        const month = String(now.getMonth() + 1); // 1-12
        const year = now.getFullYear();
        const reportPrefix = reportType === 'dashboard' ? 'dash' :
            reportType === 'pipeline' ? 'pipe' :
                'sr';
        const timestamp = `${month}${year}`;
        // Determine filename based on date range
        switch (dateRange.toLowerCase()) {
            case 'this week':
                return {
                    primary: `${reportPrefix}-weekly-${timestamp}.csv`,
                    secondary: `${reportPrefix}-current-week-${timestamp}.csv`
                };
            case 'last week':
                return {
                    primary: `${reportPrefix}-weekly-${timestamp}.csv`,
                    secondary: `${reportPrefix}-previous-week-${timestamp}.csv`
                };
            case 'this month':
                return {
                    primary: `${reportPrefix}-monthly-${timestamp}.csv`,
                    secondary: `${reportPrefix}-current-month-${timestamp}.csv`
                };
            case 'last month':
                return {
                    primary: `${reportPrefix}-monthly-${timestamp}.csv`,
                    secondary: `${reportPrefix}-previous-month-${timestamp}.csv`
                };
            case 'this year':
            case 'ytd':
                return {
                    primary: `${reportPrefix}-ytd-${timestamp}.csv`,
                    secondary: `${reportPrefix}-yearly-${timestamp}.csv`
                };
            case 'today':
            case 'yesterday':
            default:
                // For daily reports, use day-of-week and daily
                return {
                    primary: `${reportPrefix}-${dayOfWeek}-${timestamp}.csv`,
                    secondary: `${reportPrefix}-daily-${timestamp}.csv`
                };
        }
    }
    async initialize() {
        try {
            logger_1.default.info('Launching browser...');
            this.browser = await playwright_1.chromium.launch({
                headless: config_1.default.browser.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                timeout: 30000,
            });
            // Check if we have a saved session
            const hasSession = await this.loadSession();
            const contextOptions = {
                acceptDownloads: true,
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            };
            // Load saved session if available
            if (hasSession && fs.existsSync(this.sessionFilePath)) {
                contextOptions.storageState = this.sessionFilePath;
                logger_1.default.info('Restoring saved session');
            }
            this.context = await this.browser.newContext(contextOptions);
            // Set default timeouts
            this.context.setDefaultTimeout(config_1.default.browser.actionTimeout);
            this.context.setDefaultNavigationTimeout(config_1.default.browser.navigationTimeout);
            this.page = await this.context.newPage();
            // Handle downloads
            this.page.on('download', async (download) => {
                try {
                    const suggestedFilename = download.suggestedFilename();
                    const filePath = path.join(config_1.default.browser.downloadPath, suggestedFilename);
                    await download.saveAs(filePath);
                    logger_1.default.info(`Downloaded: ${suggestedFilename}`);
                }
                catch (error) {
                    logger_1.default.error('Download error:', error);
                }
            });
            // Handle page crashes
            this.page.on('crash', () => {
                logger_1.default.error('Page crashed!');
            });
            logger_1.default.info('Browser launched successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize browser', error);
            throw error;
        }
    }
    async login() {
        if (!this.page)
            throw new Error('Browser not initialized');
        let attempts = 0;
        while (attempts < this.maxRetries) {
            try {
                attempts++;
                logger_1.default.info(`Login attempt ${attempts} of ${this.maxRetries}...`);
                // Navigate to the base URL
                await this.page.goto(config_1.default.commonsku.baseUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000,
                });
                // Wait for page to settle
                await this.page.waitForTimeout(3000);
                const currentUrl = this.page.url();
                logger_1.default.info(`Current URL: ${currentUrl}`);
                // Check if already logged in by trying to access dashboard
                if (!currentUrl.includes('/login') && !currentUrl.includes('/signin') && !currentUrl.includes('/auth')) {
                    try {
                        await this.page.goto(`${config_1.default.commonsku.baseUrl}/report/sales-dashboard`, {
                            waitUntil: 'domcontentloaded',
                            timeout: 15000,
                        });
                        await this.page.waitForTimeout(2000);
                        const verifyUrl = this.page.url();
                        if (verifyUrl.includes('/report')) {
                            logger_1.default.info('Already logged in!');
                            return true;
                        }
                    }
                    catch (e) {
                        logger_1.default.info('Not logged in, proceeding to login page...');
                    }
                }
                logger_1.default.info('Login required...');
                // Navigate to login page if not already there
                if (!currentUrl.includes('/login') && !currentUrl.includes('/signin')) {
                    await this.page.goto(`${config_1.default.commonsku.baseUrl}/login`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000,
                    });
                    await this.page.waitForTimeout(3000);
                }
                // Try multiple possible selectors for email/username field
                const emailSelectors = [
                    'input[type="email"]',
                    'input[name="email"]',
                    'input[id="email"]',
                    'input[name="username"]',
                    'input[type="text"][placeholder*="email" i]',
                    'input[type="text"][placeholder*="username" i]',
                    'input[autocomplete="email"]',
                    'input[autocomplete="username"]'
                ];
                let emailField = null;
                for (const selector of emailSelectors) {
                    try {
                        emailField = await this.page.waitForSelector(selector, { timeout: 3000 });
                        if (emailField) {
                            logger_1.default.info(`Found email/username field with selector: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        // Continue trying other selectors
                    }
                }
                if (!emailField) {
                    throw new Error('Could not find email/username input field');
                }
                // Clear and fill email/username
                await emailField.click();
                await emailField.fill('');
                await emailField.type(config_1.default.commonsku.username, { delay: 50 });
                logger_1.default.info('Entered username/email');
                // Try multiple possible selectors for password field
                const passwordSelectors = [
                    'input[type="password"]',
                    'input[name="password"]',
                    'input[id="password"]',
                    'input[placeholder*="password" i]',
                    'input[autocomplete="current-password"]'
                ];
                let passwordField = null;
                for (const selector of passwordSelectors) {
                    try {
                        passwordField = await this.page.waitForSelector(selector, { timeout: 3000 });
                        if (passwordField) {
                            logger_1.default.info(`Found password field with selector: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        // Continue trying other selectors
                    }
                }
                if (!passwordField) {
                    throw new Error('Could not find password input field');
                }
                // Clear and fill password
                await passwordField.click();
                await passwordField.fill('');
                await passwordField.type(config_1.default.commonsku.password, { delay: 50 });
                logger_1.default.info('Entered password');
                // Try multiple possible selectors for login button
                const loginButtonSelectors = [
                    'button[type="submit"]',
                    'button:has-text("Sign In")',
                    'button:has-text("Login")',
                    'button:has-text("Log In")',
                    'input[type="submit"]',
                    'button.btn-primary',
                    'button.login-button'
                ];
                let loginButton = null;
                for (const selector of loginButtonSelectors) {
                    try {
                        loginButton = await this.page.$(selector);
                        if (loginButton) {
                            logger_1.default.info(`Found login button with selector: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        // Continue trying other selectors
                    }
                }
                if (loginButton) {
                    await loginButton.click();
                    logger_1.default.info('Clicked login button');
                }
                else {
                    // Try pressing Enter as fallback
                    logger_1.default.info('Could not find login button, pressing Enter...');
                    await this.page.keyboard.press('Enter');
                }
                logger_1.default.info('Login submitted, waiting for navigation...');
                // Wait for navigation with multiple conditions
                await Promise.race([
                    this.page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => { }),
                    this.page.waitForURL('**/report/**', { timeout: 10000 }).catch(() => { }),
                    this.page.waitForURL('**/home/**', { timeout: 10000 }).catch(() => { }),
                    this.page.waitForTimeout(10000)
                ]);
                // Additional wait for page to settle
                await this.page.waitForTimeout(3000);
                // Check if login was successful
                const afterLoginUrl = this.page.url();
                logger_1.default.info(`URL after login: ${afterLoginUrl}`);
                const loginSuccess = !afterLoginUrl.includes('/login') &&
                    !afterLoginUrl.includes('/signin') &&
                    !afterLoginUrl.includes('/auth');
                if (loginSuccess) {
                    logger_1.default.info('Successfully logged in!');
                    // Save session for future use
                    await this.saveSession();
                    return true;
                }
                else {
                    logger_1.default.error(`Login attempt ${attempts} failed. Still on login page.`);
                    if (attempts < this.maxRetries) {
                        logger_1.default.info(`Waiting ${this.retryDelay}ms before retry...`);
                        await this.page.waitForTimeout(this.retryDelay);
                    }
                }
            }
            catch (error) {
                logger_1.default.error(`Login attempt ${attempts} failed:`, error);
                if (attempts < this.maxRetries) {
                    logger_1.default.info(`Waiting ${this.retryDelay}ms before retry...`);
                    await this.page.waitForTimeout(this.retryDelay);
                }
            }
        }
        logger_1.default.error(`Failed to login after ${this.maxRetries} attempts`);
        return false;
    }
    async exportDashboardReport(dateRange = 'Today') {
        if (!this.page)
            throw new Error('Browser not initialized');
        // Ensure we're still logged in
        const loggedIn = await this.ensureLoggedIn();
        if (!loggedIn) {
            throw new Error('Failed to verify login session');
        }
        try {
            logger_1.default.info('Navigating to dashboard report...');
            // Navigate to dashboard report - CORRECT URL
            await this.page.goto(`${config_1.default.commonsku.baseUrl}/report/sales-dashboard`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            logger_1.default.info('Page loaded, waiting for content...');
            await this.page.waitForTimeout(5000);
            // Apply filters
            logger_1.default.info('Applying filters...');
            // Try to select Client Rep
            try {
                const clientRepSelectors = [
                    '#toggle-op-CLIENT',
                    'a:has-text("Client Rep")',
                    'button:has-text("Client Rep")',
                    '[data-value="CLIENT"]'
                ];
                for (const selector of clientRepSelectors) {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        await this.page.waitForTimeout(1000);
                        logger_1.default.info('Selected Client Rep');
                        break;
                    }
                }
            }
            catch (e) {
                logger_1.default.warn('Could not select Client Rep:', e);
            }
            // Select Sales Team - using native Playwright clicks for React components
            try {
                logger_1.default.info('Selecting Sales Team...');
                // Click dropdown to open it
                await this.page.click('.commonsku-styles-select__control');
                logger_1.default.info('Opened dropdown');
                await this.page.waitForTimeout(1500);
                // Click "Select Group" using Playwright's text selector
                try {
                    await this.page.click('text=/Select Group/i', { timeout: 3000 });
                    logger_1.default.info('Clicked Select Group');
                    await this.page.waitForTimeout(2000);
                    // Now click "Sales Team"
                    await this.page.click('text=/Sales Team/i', { timeout: 3000 });
                    logger_1.default.info('Selected Sales Team ✓');
                    await this.page.waitForTimeout(1000);
                }
                catch (e) {
                    logger_1.default.warn('Could not navigate to Sales Team, will use default filter');
                }
            }
            catch (e) {
                logger_1.default.warn('Could not select Sales Team:', e);
            }
            // Set date range - always set it since "This Year" is the default
            try {
                logger_1.default.info(`Setting date range to: ${dateRange}`);
                // Click the date input to open the date picker modal
                const dateInput = await this.page.$('input[readonly][type="text"]');
                if (dateInput) {
                    await dateInput.click();
                    await this.page.waitForTimeout(2000);
                    // Click the date range label (radio button)
                    const dateOptions = await this.page.$$(`text="${dateRange}"`);
                    for (const option of dateOptions) {
                        const isVisible = await option.isVisible();
                        if (isVisible) {
                            await option.click();
                            await this.page.waitForTimeout(1000);
                            logger_1.default.info(`Selected date range: ${dateRange}`);
                            break;
                        }
                    }
                }
                else {
                    logger_1.default.warn('Date input not found');
                }
            }
            catch (e) {
                logger_1.default.warn(`Could not set date range to ${dateRange}:`, e);
            }
            // Click Get Report button
            logger_1.default.info('Clicking Get Report button...');
            const getReportSelectors = [
                '#get-report-btn',
                'button:has-text("Get Report")',
                'button:has-text("Generate Report")',
                'button:has-text("Run Report")'
            ];
            let reportGenerated = false;
            for (const selector of getReportSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    reportGenerated = true;
                    logger_1.default.info('Clicked Get Report button');
                    break;
                }
            }
            if (!reportGenerated) {
                logger_1.default.warn('Could not find Get Report button, continuing anyway...');
            }
            // Wait for report to generate
            logger_1.default.info('Waiting for report to generate...');
            await this.page.waitForTimeout(7000);
            // Click Actions dropdown
            logger_1.default.info('Opening Actions dropdown...');
            const actionsSelectors = [
                'button:has-text("Actions")',
                'button:has-text("Export")',
                '.actions-dropdown',
                'button[aria-label="Actions"]'
            ];
            for (const selector of actionsSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    await this.page.waitForTimeout(1000);
                    logger_1.default.info('Opened Actions dropdown');
                    break;
                }
            }
            // Click Export Report
            logger_1.default.info('Clicking Export Report...');
            // Set up download promise before clicking (increased timeout for reliability)
            const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
            const exportSelectors = [
                'text="Export Report"',
                'text="Export"',
                'text="Download Report"',
                'text="Download"',
                'a:has-text("Export")',
                'button:has-text("Export")',
                '.export-button'
            ];
            let exportClicked = false;
            for (const selector of exportSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        exportClicked = true;
                        logger_1.default.info(`Clicked export with selector: ${selector}`);
                        break;
                    }
                }
                catch (e) {
                    // Continue trying other selectors
                }
            }
            if (!exportClicked) {
                throw new Error('Could not click Export Report button');
            }
            // Wait for download
            const download = await downloadPromise;
            const tempFileName = download.suggestedFilename();
            const tempFilePath = path.join(config_1.default.browser.downloadPath, tempFileName);
            await download.saveAs(tempFilePath);
            // Get filenames and folder
            const filenames = this.getCustomFilenames('dashboard', dateRange);
            const targetFolder = this.getFolderForDateRange(dateRange);
            // Create folder if it doesn't exist
            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
                logger_1.default.info(`Created folder: ${targetFolder}`);
            }
            // Save both files (primary and secondary)
            const files = [filenames.primary, filenames.secondary];
            for (const filename of files) {
                const finalFilePath = path.join(targetFolder, filename);
                // Delete existing file if it exists
                if (fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    logger_1.default.info(`Deleted existing file: ${filename}`);
                }
                // Copy the file
                fs.copyFileSync(tempFilePath, finalFilePath);
                logger_1.default.info(`Dashboard report exported: ${filename} to ${path.basename(targetFolder)}/`);
            }
            // Delete temp file
            fs.unlinkSync(tempFilePath);
            const primaryFilePath = path.join(targetFolder, filenames.primary);
            // Upload to Google Drive if enabled
            await this.uploadToGoogleDrive(primaryFilePath, dateRange);
            return primaryFilePath;
        }
        catch (error) {
            logger_1.default.error('Failed to export dashboard report', error);
            // Take a screenshot for debugging
            try {
                const screenshotPath = path.join(config_1.default.browser.downloadPath, `error_dashboard_${Date.now()}.png`);
                await this.page?.screenshot({ path: screenshotPath, fullPage: true });
                logger_1.default.info(`Screenshot saved: ${screenshotPath}`);
            }
            catch (e) {
                logger_1.default.error('Could not take screenshot:', e);
            }
            return null;
        }
    }
    async exportPipelineReport(dateRange = 'Today') {
        if (!this.page)
            throw new Error('Browser not initialized');
        // Ensure we're still logged in
        const loggedIn = await this.ensureLoggedIn();
        if (!loggedIn) {
            throw new Error('Failed to verify login session');
        }
        try {
            logger_1.default.info('Navigating to pipeline report...');
            // Navigate to pipeline report - CORRECTED URL
            await this.page.goto(`${config_1.default.commonsku.baseUrl}/report/sales-pipeline`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await this.page.waitForTimeout(5000);
            // Apply filters - Pipeline uses Order Rep
            logger_1.default.info('Applying filters...');
            // Select Order Rep type (Pipeline always uses Order Rep)
            logger_1.default.info('Selecting Order Rep type...');
            const orderRepSelector = '#toggle-op-ORDER';
            const orderRepButton = await this.page.$(orderRepSelector);
            if (orderRepButton) {
                const isSelected = await orderRepButton.getAttribute('aria-selected');
                if (isSelected !== 'true') {
                    await orderRepButton.click();
                    await this.page.waitForTimeout(1000);
                    logger_1.default.info('Selected Order Rep');
                }
                else {
                    logger_1.default.info('Order Rep already selected');
                }
            }
            else {
                logger_1.default.warn('Order Rep toggle not found');
            }
            // Select Sales Team - using native Playwright clicks for React components
            try {
                logger_1.default.info('Selecting Sales Team...');
                // Click dropdown to open it
                await this.page.click('.commonsku-styles-select__control');
                logger_1.default.info('Opened dropdown');
                await this.page.waitForTimeout(1500);
                // Click "Select Group" using Playwright's text selector
                try {
                    await this.page.click('text=/Select Group/i', { timeout: 3000 });
                    logger_1.default.info('Clicked Select Group');
                    await this.page.waitForTimeout(2000);
                    // Now click "Sales Team"
                    await this.page.click('text=/Sales Team/i', { timeout: 3000 });
                    logger_1.default.info('Selected Sales Team ✓');
                    await this.page.waitForTimeout(1000);
                }
                catch (e) {
                    logger_1.default.warn('Could not navigate to Sales Team, will use default filter');
                }
            }
            catch (e) {
                logger_1.default.warn('Could not select Sales Team:', e);
            }
            // Set date range - always set it since "This Year" is the default
            logger_1.default.info(`Setting date range to: ${dateRange}`);
            try {
                const dateInput = await this.page.$('input[readonly][type="text"]');
                if (dateInput) {
                    await dateInput.click();
                    await this.page.waitForTimeout(2000);
                    const dateOptions = await this.page.$$(`text="${dateRange}"`);
                    for (const option of dateOptions) {
                        const isVisible = await option.isVisible();
                        if (isVisible) {
                            await option.click();
                            await this.page.waitForTimeout(1000);
                            logger_1.default.info(`Selected date range: ${dateRange}`);
                            break;
                        }
                    }
                }
                else {
                    logger_1.default.warn('Date input not found');
                }
            }
            catch (e) {
                logger_1.default.warn(`Could not set date range to ${dateRange}:`, e);
            }
            // Similar process as dashboard
            logger_1.default.info('Clicking Get Report button...');
            const getReportSelectors = [
                '#get-report-btn',
                'button:has-text("Get Report")',
                'button:has-text("Generate Report")',
                'button:has-text("Run Report")'
            ];
            for (const selector of getReportSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    logger_1.default.info('Clicked Get Report button');
                    break;
                }
            }
            await this.page.waitForTimeout(7000);
            logger_1.default.info('Opening Actions dropdown...');
            const actionsSelectors = [
                'button:has-text("Actions")',
                'button:has-text("Export")',
                '.actions-dropdown'
            ];
            for (const selector of actionsSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    await this.page.waitForTimeout(1000);
                    break;
                }
            }
            logger_1.default.info('Clicking Export Report...');
            const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
            const exportSelectors = [
                'text="Export Report"',
                'text="Export"',
                'text="Download Report"'
            ];
            for (const selector of exportSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        break;
                    }
                }
                catch (e) {
                    // Continue
                }
            }
            const download = await downloadPromise;
            const tempFileName = download.suggestedFilename();
            const tempFilePath = path.join(config_1.default.browser.downloadPath, tempFileName);
            await download.saveAs(tempFilePath);
            // Get filenames and folder
            const filenames = this.getCustomFilenames('pipeline', dateRange);
            const targetFolder = this.getFolderForDateRange(dateRange);
            // Create folder if it doesn't exist
            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
                logger_1.default.info(`Created folder: ${targetFolder}`);
            }
            // Save both files (primary and secondary)
            const files = [filenames.primary, filenames.secondary];
            for (const filename of files) {
                const finalFilePath = path.join(targetFolder, filename);
                // Delete existing file if it exists
                if (fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    logger_1.default.info(`Deleted existing file: ${filename}`);
                }
                // Copy the file
                fs.copyFileSync(tempFilePath, finalFilePath);
                logger_1.default.info(`Pipeline report exported: ${filename} to ${path.basename(targetFolder)}/`);
            }
            // Delete temp file
            fs.unlinkSync(tempFilePath);
            const primaryFilePath = path.join(targetFolder, filenames.primary);
            // Upload to Google Drive if enabled
            await this.uploadToGoogleDrive(primaryFilePath, dateRange);
            return primaryFilePath;
        }
        catch (error) {
            logger_1.default.error('Failed to export pipeline report', error);
            return null;
        }
    }
    async exportSalesOrdersReport(dateRange = 'This Week') {
        if (!this.page)
            throw new Error('Browser not initialized');
        // Ensure we're still logged in
        const loggedIn = await this.ensureLoggedIn();
        if (!loggedIn) {
            throw new Error('Failed to verify login session');
        }
        try {
            logger_1.default.info('Navigating to sales rep report...');
            // Navigate to sales rep report - CORRECTED URL
            await this.page.goto(`${config_1.default.commonsku.baseUrl}/report/sales-rep`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await this.page.waitForTimeout(5000);
            // Apply filters
            logger_1.default.info('Applying filters...');
            // Select Form Type: Sales Order (MANDATORY)
            try {
                logger_1.default.info('Attempting to select Form Type: Sales Order...');
                // Wait for page to be fully ready
                await this.page.waitForTimeout(2000);
                // Find the Form Type dropdown using data-testid
                const formTypeContainer = await this.page.$('[data-testid="sales_rep-filter-form_type"]');
                if (formTypeContainer) {
                    logger_1.default.info('Found Form Type container via data-testid');
                    // Find the dropdown control within it
                    const dropdown = await formTypeContainer.$('.commonsku-styles-select__control');
                    if (dropdown) {
                        logger_1.default.info('Found Form Type dropdown, clicking...');
                        await dropdown.click();
                        await this.page.waitForTimeout(1500);
                        // Look for "Sales Order" option - must match exactly
                        const salesOrderOption = await this.page.$('div.commonsku-styles-select__option:has-text("Sales Order")');
                        if (salesOrderOption) {
                            const isVisible = await salesOrderOption.isVisible();
                            logger_1.default.info(`Sales Order option visible: ${isVisible}`);
                            if (isVisible) {
                                await salesOrderOption.click();
                                logger_1.default.info('✓ Selected Form Type: Sales Order');
                                await this.page.waitForTimeout(1000);
                            }
                            else {
                                logger_1.default.warn('Sales Order option found but not visible');
                            }
                        }
                        else {
                            logger_1.default.warn('Sales Order option not found in dropdown');
                        }
                    }
                    else {
                        logger_1.default.warn('Dropdown control not found in Form Type container');
                    }
                }
                else {
                    logger_1.default.warn('Form Type container with data-testid not found');
                }
            }
            catch (e) {
                logger_1.default.error('Failed to select Form Type:', e);
            }
            // Set date range - always set it since "This Year" is the default
            logger_1.default.info(`Setting date range to: ${dateRange}`);
            try {
                const dateInput = await this.page.$('input[readonly][type="text"]');
                if (dateInput) {
                    await dateInput.click();
                    await this.page.waitForTimeout(2000);
                    const dateOptions = await this.page.$$(`text="${dateRange}"`);
                    for (const option of dateOptions) {
                        const isVisible = await option.isVisible();
                        if (isVisible) {
                            await option.click();
                            await this.page.waitForTimeout(1000);
                            logger_1.default.info(`Selected date range: ${dateRange}`);
                            break;
                        }
                    }
                }
                else {
                    logger_1.default.warn('Date input not found');
                }
            }
            catch (e) {
                logger_1.default.warn(`Could not set date range to ${dateRange}:`, e);
            }
            // Similar process as dashboard
            logger_1.default.info('Clicking Get Report button...');
            const getReportSelectors = [
                '#get-report-btn',
                'button:has-text("Get Report")',
                'button:has-text("Generate Report")',
                'button:has-text("Run Report")'
            ];
            let reportButtonClicked = false;
            for (const selector of getReportSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    reportButtonClicked = true;
                    logger_1.default.info('Clicked Get Report button');
                    break;
                }
            }
            if (!reportButtonClicked) {
                logger_1.default.warn('Could not find Get Report button, continuing anyway...');
            }
            // Wait longer for report to generate (sales rep can be slow)
            logger_1.default.info('Waiting for report to generate...');
            await this.page.waitForTimeout(15000);
            // Set up download promise BEFORE opening dropdown (increased timeout for reliability)
            const downloadPromise = this.page.waitForEvent('download', { timeout: 90000 });
            logger_1.default.info('Opening Actions dropdown...');
            const actionsSelectors = [
                'button:has-text("Actions")',
                'button.btn-default:has-text("Actions")',
                'button[aria-haspopup="true"]:has-text("Actions")',
                'button:has-text("Export")',
                '.actions-dropdown',
                '[data-testid="actions-dropdown"]'
            ];
            let actionsOpened = false;
            for (const selector of actionsSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.click();
                        actionsOpened = true;
                        logger_1.default.info(`Opened Actions dropdown with selector: ${selector}`);
                        await this.page.waitForTimeout(1500);
                        break;
                    }
                }
                catch (e) {
                    // Continue trying other selectors
                }
            }
            if (!actionsOpened) {
                logger_1.default.warn('Could not open Actions dropdown with standard selectors, trying alternative methods...');
                // Try to find any button containing "Actions" text
                const actionButtons = await this.page.$$('button');
                for (const btn of actionButtons) {
                    const text = await btn.textContent();
                    if (text && text.toLowerCase().includes('action')) {
                        await btn.click();
                        actionsOpened = true;
                        logger_1.default.info('Found and clicked Actions button via text search');
                        await this.page.waitForTimeout(1500);
                        break;
                    }
                }
            }
            logger_1.default.info('Clicking Export Report...');
            const exportSelectors = [
                'text="Export Report"',
                'a:has-text("Export Report")',
                'button:has-text("Export Report")',
                '[role="menuitem"]:has-text("Export")',
                'text="Export"',
                'text="Download Report"',
                'a:has-text("Export")',
                'li:has-text("Export Report")'
            ];
            let exportClicked = false;
            for (const selector of exportSelectors) {
                try {
                    const elements = await this.page.$$(selector);
                    for (const element of elements) {
                        if (await element.isVisible()) {
                            await element.click();
                            exportClicked = true;
                            logger_1.default.info(`Clicked export with selector: ${selector}`);
                            break;
                        }
                    }
                    if (exportClicked)
                        break;
                }
                catch (e) {
                    // Continue trying other selectors
                }
            }
            if (!exportClicked) {
                // Take a screenshot before throwing
                const screenshotPath = path.join(config_1.default.browser.downloadPath, `error_sr_export_${Date.now()}.png`);
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                logger_1.default.error(`Screenshot saved: ${screenshotPath}`);
                throw new Error('Could not click Export Report button - check screenshot for UI state');
            }
            const download = await downloadPromise;
            const tempFileName = download.suggestedFilename();
            const tempFilePath = path.join(config_1.default.browser.downloadPath, tempFileName);
            await download.saveAs(tempFilePath);
            // Get filenames and folder
            const filenames = this.getCustomFilenames('salesrep', dateRange);
            const targetFolder = this.getFolderForDateRange(dateRange);
            // Create folder if it doesn't exist
            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
                logger_1.default.info(`Created folder: ${targetFolder}`);
            }
            // Save both files (primary and secondary)
            const files = [filenames.primary, filenames.secondary];
            for (const filename of files) {
                const finalFilePath = path.join(targetFolder, filename);
                // Delete existing file if it exists
                if (fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    logger_1.default.info(`Deleted existing file: ${filename}`);
                }
                // Copy the file
                fs.copyFileSync(tempFilePath, finalFilePath);
                logger_1.default.info(`Sales rep report exported: ${filename} to ${path.basename(targetFolder)}/`);
            }
            // Delete temp file
            fs.unlinkSync(tempFilePath);
            const primaryFilePath = path.join(targetFolder, filenames.primary);
            // Upload to Google Drive if enabled
            await this.uploadToGoogleDrive(primaryFilePath, dateRange);
            return primaryFilePath;
        }
        catch (error) {
            logger_1.default.error('Failed to export sales rep report', error);
            return null;
        }
    }
    async exportAllReports() {
        const results = {
            dashboard: null,
            pipeline: null,
            salesOrders: null,
        };
        try {
            results.dashboard = await this.exportDashboardReport();
            await this.page?.waitForTimeout(2000);
            results.pipeline = await this.exportPipelineReport();
            await this.page?.waitForTimeout(2000);
            results.salesOrders = await this.exportSalesOrdersReport();
            logger_1.default.info('All reports exported successfully', results);
        }
        catch (error) {
            logger_1.default.error('Error exporting reports', error);
        }
        return results;
    }
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close().catch(() => { });
            }
            if (this.context) {
                await this.context.close().catch(() => { });
            }
            if (this.browser) {
                await this.browser.close().catch(() => { });
            }
            logger_1.default.info('Browser closed successfully');
        }
        catch (error) {
            logger_1.default.error('Error during cleanup', error);
        }
    }
}
exports.CommonSKUAutomation = CommonSKUAutomation;
exports.default = CommonSKUAutomation;
