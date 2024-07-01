import { chromium, Browser, Page } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

// Configuration loaded from .env file
const CAMUNDA_URL = process.env.CAMUNDA_URL || '';
const USERNAME = process.env.USERNAME || '';
const PASSWORD = process.env.PASSWORD || '';
const PROCESS_NAME = process.env.PROCESS_NAME || 'Test Process';
const REST_URL = process.env.REST_URL || 'https://api.example.com/data';

async function run() {
    let browser: Browser | undefined;
    try {
        browser = await chromium.launch({ headless: false }); // Launch browser in non-headless mode for visibility
        const context = await browser.newContext();
        const page = await context.newPage();

        await login(page, USERNAME, PASSWORD);
        await navigateToModeler(page);
        await createProcess(page, PROCESS_NAME, REST_URL);
        await runProcessInstance(page, PROCESS_NAME);
        await verifyCompletion(page, PROCESS_NAME);

    } catch (error) {
        console.error('An error occurred:', (error as Error).message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Log in to Camunda.
 * @param page The Playwright page instance.
 * @param username The username for login.
 * @param password The password for login.
 */
async function login(page: Page, username: string, password: string) {
    try {
        await page.goto(`${CAMUNDA_URL}/login`);
        await page.fill('input[name="username"]', username); // Assuming username field has name attribute
        await page.press('input[name="username"]', 'Enter'); // Simulate pressing Enter after filling username
        await page.fill('input[name="password"]', password); // Assuming password field has name attribute
        await page.press('input[name="password"]', 'Enter'); // Simulate pressing Enter after filling password
        await page.waitForNavigation();
        console.log('Logged in successfully');
    } catch (error) {
        throw new Error('Login failed: ' + (error as Error).message);
    }
}

/**
 * Navigate to the Web Modeler.
 * @param page The Playwright page instance.
 */
async function navigateToModeler(page: Page) {
    try {
        await page.goto(`${CAMUNDA_URL}`);
        await page.waitForSelector('button >> text=Create process'); // Wait for Create process button to appear
        console.log('Navigated to Web Modeler');
    } catch (error) {
        throw new Error('Navigation to Web Modeler failed: ' + (error as Error).message);
    }
}

/**
 * Create a new process in Camunda with a REST Connector.
 * @param page The Playwright page instance.
 * @param processName The name of the new process.
 * @param restUrl The REST URL for the connector.
 */
async function createProcess(page: Page, processName: string, restUrl: string) {
    try {
        await page.click('button >> text=Create process'); // Click on Create process button
        await page.fill('input#process-name', processName); // Fill in process name input
        await page.click('button >> text=Create'); // Click on Create button

        // Add a REST Connector to the process
        await page.click('button >> text=Add Connector'); // Click on Add Connector button

        // Use Playwright recording or XPath to identify a reliable selector for REST URL input
        const restUrlInput = await page.waitForSelector('input#rest-url', { timeout: 5000 }); // Wait for REST URL input to appear
        await restUrlInput.fill(restUrl);
        await page.click('button >> text=Save Connector'); // Click on Save Connector button

        // Save the process
        await page.click('button >> text=Save'); // Click on Save button

        console.log(`Process "${processName}" created successfully`);
    } catch (error) {
        throw new Error('Process creation failed: ' + (error as Error).message);
    }
}

/**
 * Run an instance of the specified process.
 * @param page The Playwright page instance.
 * @param processName The name of the process to run.
 */
async function runProcessInstance(page: Page, processName: string) {
    try {
        await page.goto(`${CAMUNDA_URL}/run`);
        await page.click('button >> text=Run instance'); // Click on Run instance button

        // Open Operate sidebar menu (assuming a sidebar menu exists)
        await page.click('button#operate-sidebar-toggle'); // Click on Operate sidebar toggle button

        // Use Playwright recording or XPath to identify a reliable selector for the Operate link
        const operateLink = await page.waitForSelector('a#operate-link'); // Wait for Operate link to appear
        await operateLink.click();

        // Use Playwright recording or XPath to identify a reliable selector for the process name dropdown
        const processNameDropdown = await page.waitForSelector('select#process-name'); // Wait for process name dropdown to appear
        await processNameDropdown.selectOption(processName);
        await page.click('button >> text=Start instance'); // Click on Start instance button

        console.log(`Process instance of "${processName}" started successfully`);
    } catch (error) {
        throw new Error('Running process instance failed: ' + (error as Error).message);
    }
}

/**
 * Verify the completion of the process instance in Operate.
 * @param page The Playwright page instance.
 * @param processName The name of the process to verify.
 */
async function verifyCompletion(page: Page, processName: string) {
    try {
        // Assuming Operate verification uses the same sidebar menu
        await page.click('button#operate-sidebar-toggle'); // Click on Operate sidebar toggle button

        // Use Playwright recording or XPath to identify a reliable selector for the Operate link
        const operateLink = await page.waitForSelector('a#operate-link'); // Wait for Operate link to appear
        await operateLink.click();

        await page.fill('input#process-search', processName); // Fill in process search input
        await page.click('button >> text=Search'); // Click on Search button

        // Check if the process instance is completed
        const processRowSelector = `tr[id="process-row-${processName}"]`; // Combine ID and process name
        const completionStatusCellSelector = `${processRowSelector} td[id="completion-status"]`; // Target completion status cell

        await page.waitForSelector(completionStatusCellSelector); // Wait for completion status cell to appear

        const completionStatus = await page.textContent(completionStatusCellSelector); // Get completion status text
        if (completionStatus === 'Completed') {
            console.log(`Process instance of "${processName}" completed successfully`);
        } else {
            console.log(`Process instance of "${processName}" did not complete`);
        }
    } catch (error) {
        throw new Error('Verification of process completion failed: ' + (error as Error).message);
    }
}

run();
