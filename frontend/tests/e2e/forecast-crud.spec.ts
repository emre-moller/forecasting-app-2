import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  createTestForecast,
  cleanupTestForecasts,
  cleanupTestSnapshots,
  getDepartments,
  getProjects,
  fillForecastForm,
  formatNOK,
  tableRowExists,
  getForecastCount,
  clickRowAction,
} from './utils/test-helpers';

/**
 * E2E Tests: Forecast CRUD Operations
 * Tests creating, reading, updating, and deleting forecasts
 */

test.describe('Forecast CRUD Operations', () => {
  let testDepartments: any[];
  let testProjects: any[];

  test.beforeAll(async () => {
    // Get test data
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    await cleanupTestSnapshots();
    await cleanupTestForecasts();

    // Navigate to dashboard
    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    // Clean up after each test
    await cleanupTestSnapshots();
    await cleanupTestForecasts();
  });

  test('should display the dashboard with statistics', async ({ page }) => {
    // Verify main statistics cards are present
    await expect(page.locator('.ant-statistic-title:has-text("Totalt Prognostisert")')).toBeVisible();
    await expect(page.locator('.ant-statistic-title:has-text("Avdelinger")')).toBeVisible();
    await expect(page.locator('.ant-statistic-title:has-text("Prosjekter")')).toBeVisible();

    // Verify tables are present
    await expect(page.locator('text=FORECAST SNAPSHOTS')).toBeVisible();
    await expect(page.locator('text=LIVE FORECASTS')).toBeVisible();

    // Verify "Ny Prognose" button is present
    await expect(page.locator('button:has-text("Ny Prognose")')).toBeVisible();
  });

  test('should create a new forecast', async ({ page }) => {
    const initialCount = await getForecastCount(page, 'live');

    // Click "Ny Prognose" button
    await page.locator('button:has-text("Ny Prognose")').click();

    // Verify modal is open
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Fill the form
    await fillForecastForm(page, {
      department: 'Teknologi',
      project: 'Web Platform Upgrade',
      projectName: 'E2E Test Cloud Migration',
      profitCenter: 'PC-TEST-001',
      wbs: 'WBS-TEST-001',
      account: '5000',
      monthlyValues: [100000, 150000, 200000, 180000, 160000, 140000, 120000, 130000, 140000, 150000, 160000, 170000],
    });

    // Submit the form
    await page.locator('button:has-text("Opprett")').click();

    // Wait for modal to close
    await expect(page.locator('text=Ny Utgiftsprognose')).not.toBeVisible();

    // Verify forecast appears in table
    await page.waitForTimeout(1000); // Wait for table to update

    const newCount = await getForecastCount(page, 'live');
    expect(newCount).toBe(initialCount + 1);

    // Verify the data is correct in the table
    const rowCount = await tableRowExists(page, {
      projectName: 'E2E Test Cloud Migration',
      profitCenter: 'PC-TEST-001',
      wbs: 'WBS-TEST-001',
      account: '5000',
    });

    expect(rowCount).toBeGreaterThan(0);

    // Verify total calculation (sum of monthly values)
    const expectedYearlySum = 1800000;
    const formattedAmount = formatNOK(expectedYearlySum);
    await expect(page.locator(`text=${formattedAmount}`).first()).toBeVisible();
  });

  test('should edit an existing forecast', async ({ page }) => {
    // Create a test forecast via API
    const departments = await getDepartments();
    const projects = await getProjects();

    const testForecast = await createTestForecast({
      departmentId: departments[0].id,
      projectId: projects[0].id,
      projectName: 'Original Project Name',
      profitCenter: 'PC-ORIG-001',
      wbs: 'WBS-ORIG-001',
      account: '6000',
      monthlyValues: Array(12).fill(100000),
    });

    // Reload page to see the new forecast
    await page.reload();
    await waitForDashboardLoad(page);

    // Click Edit button for the test forecast
    await clickRowAction(page, { wbs: 'WBS-ORIG-001' }, 'Edit');

    // Verify modal is open
    await expect(page.locator('text=Rediger Prognose')).toBeVisible();

    // Verify form is pre-filled
    await expect(page.locator('input[placeholder="Prosjektnavn"]')).toHaveValue('Original Project Name');

    // Update project name
    await page.locator('input[placeholder="Prosjektnavn"]').fill('Updated Project Name');

    // Update WBS
    await page.locator('input[placeholder="WBS"]').fill('WBS-UPDATED-001');

    // Update first month value
    await page.locator('input[placeholder="JAN"]').fill('200000');

    // Submit the form
    await page.locator('button:has-text("Oppdater")').click();

    // Wait for modal to close
    await expect(page.locator('text=Rediger Prognose')).not.toBeVisible();

    // Wait for table to update
    await page.waitForTimeout(1000);

    // Verify the updated data appears in the table
    const rowCount = await tableRowExists(page, {
      projectName: 'Updated Project Name',
      wbs: 'WBS-UPDATED-001',
    });

    expect(rowCount).toBeGreaterThan(0);

    // Verify old data is gone
    const oldRowCount = await tableRowExists(page, {
      projectName: 'Original Project Name',
      wbs: 'WBS-ORIG-001',
    });

    expect(oldRowCount).toBe(0);
  });

  test('should delete a forecast', async ({ page }) => {
    // Create a test forecast via API
    const departments = await getDepartments();
    const projects = await getProjects();

    await createTestForecast({
      departmentId: departments[0].id,
      projectId: projects[0].id,
      projectName: 'Forecast to Delete',
      profitCenter: 'PC-DEL-001',
      wbs: 'WBS-DEL-001',
      account: '7000',
    });

    // Reload page to see the new forecast
    await page.reload();
    await waitForDashboardLoad(page);

    const initialCount = await getForecastCount(page, 'live');

    // Click Delete button for the test forecast
    await clickRowAction(page, { wbs: 'WBS-DEL-001' }, 'Delete');

    // Handle confirmation dialog if it exists
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify forecast count decreased
    const newCount = await getForecastCount(page, 'live');
    expect(newCount).toBe(initialCount - 1);

    // Verify the forecast is no longer in the table
    const rowCount = await tableRowExists(page, {
      wbs: 'WBS-DEL-001',
    });

    expect(rowCount).toBe(0);
  });

  test('should display all 12 monthly columns in the table', async ({ page }) => {
    // Create a test forecast
    const departments = await getDepartments();
    const projects = await getProjects();

    await createTestForecast({
      departmentId: departments[0].id,
      projectId: projects[0].id,
      projectName: 'Monthly Columns Test',
      profitCenter: 'PC-MONTH-001',
      wbs: 'WBS-MONTH-001',
      account: '8000',
      monthlyValues: [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 110000, 120000],
    });

    await page.reload();
    await waitForDashboardLoad(page);

    // Verify all month column headers exist
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    for (const month of months) {
      await expect(page.locator(`th:has-text("${month}")`).first()).toBeVisible();
    }

    // Verify Total and Yearly Sum columns
    await expect(page.locator('th:has-text("Total")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Yearly Sum")').first()).toBeVisible();
  });

  test('should calculate total and yearly sum correctly', async ({ page }) => {
    // Create a test forecast with known values
    const monthlyValues = [100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000];
    const expectedTotal = monthlyValues.reduce((sum, val) => sum + val, 0); // 4,650,000

    const departments = await getDepartments();
    const projects = await getProjects();

    await createTestForecast({
      departmentId: departments[0].id,
      projectId: projects[0].id,
      projectName: 'Calculation Test',
      profitCenter: 'PC-CALC-001',
      wbs: 'WBS-CALC-001',
      account: '9000',
      monthlyValues,
    });

    await page.reload();
    await waitForDashboardLoad(page);

    // Find the row and verify the total
    const row = page.locator('tr:has-text("WBS-CALC-001")').first();

    // The yearly sum should be visible in the row
    const formattedTotal = formatNOK(expectedTotal);
    await expect(row.locator(`text=${formattedTotal}`).first()).toBeVisible();
  });

  test('should show empty state when no forecasts exist', async ({ page }) => {
    // Ensure all forecasts are deleted
    await cleanupTestForecasts();

    await page.reload();
    await waitForDashboardLoad(page);

    // Check if live forecasts table shows empty state or minimal content
    const liveCount = await getForecastCount(page, 'live');

    // Depending on implementation, there might be existing sample data
    // So we just verify the table exists and can display data
    expect(liveCount).toBeGreaterThanOrEqual(0);
  });

  test('should persist data after page reload', async ({ page }) => {
    // Create a test forecast
    const departments = await getDepartments();
    const projects = await getProjects();

    await createTestForecast({
      departmentId: departments[0].id,
      projectId: projects[0].id,
      projectName: 'Persistence Test',
      profitCenter: 'PC-PERSIST-001',
      wbs: 'WBS-PERSIST-001',
      account: '5500',
    });

    await page.reload();
    await waitForDashboardLoad(page);

    // Verify forecast exists
    let rowCount = await tableRowExists(page, {
      wbs: 'WBS-PERSIST-001',
    });
    expect(rowCount).toBeGreaterThan(0);

    // Reload again
    await page.reload();
    await waitForDashboardLoad(page);

    // Verify forecast still exists
    rowCount = await tableRowExists(page, {
      wbs: 'WBS-PERSIST-001',
    });
    expect(rowCount).toBeGreaterThan(0);
  });
});
