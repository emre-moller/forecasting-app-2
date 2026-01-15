import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  getDepartments,
  getProjects,
  createTestForecast,
  cleanupTestForecasts,
  cleanupTestSnapshots,
} from './utils/test-helpers';

/**
 * E2E Tests: Bulk Snapshot Submission
 * Tests the new bulk snapshot submission workflow
 */

test.describe('Bulk Snapshot Submission', () => {
  let testDepartments: any[];
  let testProjects: any[];

  test.beforeAll(async () => {
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    await cleanupTestSnapshots();
    await cleanupTestForecasts();

    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    // Clean up after each test
    await cleanupTestSnapshots();
    await cleanupTestForecasts();
  });

  test('should display "Submit All Forecasts" button', async ({ page }) => {
    // Verify the new submit all button exists
    await expect(page.locator('button:has-text("SUBMIT ALL FORECASTS")')).toBeVisible();
  });

  test('should disable submit button when no department is selected', async ({ page }) => {
    // Button should be disabled initially
    const submitButton = page.locator('button:has-text("SUBMIT ALL FORECASTS")');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when department is selected and forecasts exist', async ({ page }) => {
    // Use test project 9 or 10 (these are reserved for testing)
    const testProj = testProjects.find(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProj.department_id);

    await createTestForecast({
      departmentId: dept.id.toString(),
      projectId: testProj.id.toString(),
      projectName: 'Test Bulk Submission',
      profitCenter: 'PC-TEST-001',
      wbs: 'WBS-BULK-TEST',
      account: 'ACC-TEST-001',
    });

    // Reload page to get new forecast
    await page.reload();
    await waitForDashboardLoad(page);

    // Initially button should be disabled (no department selected)
    const submitButton = page.locator('button:has-text("SUBMIT ALL FORECASTS")');
    await expect(submitButton).toBeDisabled();

    // Select the department
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();

    // Wait for forecasts to load and filter
    await page.waitForTimeout(2000);

    // Button should now be enabled
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
  });

  test('should submit all forecasts for selected department', async ({ page }) => {
    // Use test projects 9 and 10
    const testProjects9and10 = testProjects.filter(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProjects9and10[0].department_id);

    for (let i = 0; i < testProjects9and10.length; i++) {
      await createTestForecast({
        departmentId: dept.id.toString(),
        projectId: testProjects9and10[i].id.toString(),
        projectName: `Test Forecast ${i + 1}`,
        profitCenter: `PC-TEST-00${i + 1}`,
        wbs: `WBS-BULK-${i + 1}`,
        account: `ACC-TEST-00${i + 1}`,
      });
    }

    // Reload page
    await page.reload();
    await waitForDashboardLoad(page);

    // Select the department
    await page.locator('.ant-select').first().click();
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();
    await page.waitForTimeout(500);

    // Get the number of live forecasts
    const liveTable = page.locator('.forecast-input-section table');
    const liveForecasts = liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'});
    const forecastCount = await liveForecasts.count();
    expect(forecastCount).toBeGreaterThan(0);

    // Set up dialog handler to accept all dialogs
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });

    // Click submit all button
    const submitButton = page.locator('button:has-text("SUBMIT ALL FORECASTS")');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForTimeout(4000);
  });


  test('should not show individual Submit buttons in live forecasts table', async ({ page }) => {
    // The live forecasts table should NOT have individual "Submit" buttons
    // Only the "SUBMIT ALL FORECASTS" button at the top
    const liveTable = page.locator('.forecast-input-section table');

    // Verify no "Submit" buttons exist in the table itself
    const submitButtonsInTable = liveTable.locator('button:has-text("Submit")');
    await expect(submitButtonsInTable).toHaveCount(0);

    // But the "SUBMIT ALL FORECASTS" button should exist in the header
    await expect(page.locator('button:has-text("SUBMIT ALL FORECASTS")')).toBeVisible();
  });
});
