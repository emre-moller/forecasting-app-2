import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  getDepartments,
  getProjects,
  createTestForecast,
  cleanupTestForecasts,
} from './utils/test-helpers';

/**
 * E2E Tests: User Workflows
 * Tests real user interactions: inline editing, filtering, row operations
 */

test.describe('User Workflows', () => {
  let testDepartments: any[];
  let testProjects: any[];

  test.beforeAll(async () => {
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    await cleanupTestForecasts();
    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestForecasts();
  });

  test('should edit cell values inline by clicking', async ({ page }) => {
    // Create a test forecast
    const testProj = testProjects.find(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProj.department_id);

    await createTestForecast({
      departmentId: dept.id.toString(),
      projectId: testProj.id.toString(),
      projectName: 'Inline Edit Test',
      profitCenter: 'PC-EDIT-001',
      wbs: 'WBS-EDIT',
      account: 'ACC-EDIT-001',
    });

    // Reload and select department
    await page.reload();
    await waitForDashboardLoad(page);

    // Select department
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();
    await page.waitForTimeout(2000);

    // Find the live forecasts table
    const liveTable = page.locator('.forecast-input-section table');
    await expect(liveTable).toBeVisible();

    // Find a data row (not the "click to add" row)
    const dataRow = liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'}).first();
    await expect(dataRow).toBeVisible();

    // Find a cell with numeric content (one of the month columns)
    const cellWithNumber = dataRow.locator('.cell-number').first();
    await expect(cellWithNumber).toBeVisible();

    // Click to edit
    await cellWithNumber.click();
    await page.waitForTimeout(500);

    // Should see an input field
    const input = dataRow.locator('input[type="number"]').first();
    await expect(input).toBeVisible();

    // Change the value
    await input.fill('250000');
    await input.press('Enter');

    // Wait for update to process
    await page.waitForTimeout(2000);

    // Verify the change persisted (value should be visible in the cell)
    await expect(dataRow).toContainText('250');
  });

  test('should filter forecasts by department selection', async ({ page }) => {
    // Create forecasts in different departments
    const dept1 = testDepartments[0];
    const dept2 = testDepartments[1];
    const proj1 = testProjects.find(p => p.department_id === dept1.id);
    const proj2 = testProjects.find(p => p.department_id === dept2.id);

    if (!proj1 || !proj2) {
      test.skip();
      return;
    }

    await createTestForecast({
      departmentId: dept1.id.toString(),
      projectId: proj1.id.toString(),
      projectName: 'Dept 1 Forecast',
      profitCenter: 'PC-D1-001',
      wbs: 'WBS-D1',
      account: 'ACC-D1-001',
    });

    await createTestForecast({
      departmentId: dept2.id.toString(),
      projectId: proj2.id.toString(),
      projectName: 'Dept 2 Forecast',
      profitCenter: 'PC-D2-001',
      wbs: 'WBS-D2',
      account: 'ACC-D2-001',
    });

    // Reload page
    await page.reload();
    await waitForDashboardLoad(page);

    // Select department 1
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept1.name}")`).first().click();
    await page.waitForTimeout(2000);

    // Should only see Dept 1 forecast
    const liveTable = page.locator('.forecast-input-section table');
    await expect(liveTable).toContainText('Dept 1 Forecast', { timeout: 10000 });
    await expect(liveTable).not.toContainText('Dept 2 Forecast');

    // Change to department 2
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept2.name}")`).first().click();
    await page.waitForTimeout(2000);

    // Should only see Dept 2 forecast
    await expect(liveTable).toContainText('Dept 2 Forecast', { timeout: 10000 });
    await expect(liveTable).not.toContainText('Dept 1 Forecast');
  });

  test('should add a new row when clicking ADD ROW button', async ({ page }) => {
    const testProj = testProjects.find(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProj.department_id);

    // Select department first
    await page.locator('.ant-select').first().click();
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();
    await page.waitForTimeout(500);

    // Get initial row count
    const liveTable = page.locator('.forecast-input-section table');
    const initialRows = await liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'}).count();

    // Click ADD ROW button
    await page.locator('button:has-text("ADD ROW")').click();
    await page.waitForTimeout(1500);

    // Should have one more row
    const newRowCount = await liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'}).count();
    expect(newRowCount).toBe(initialRows + 1);

    // New row should have editable fields
    const newRow = liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'}).first();
    await expect(newRow).toBeVisible();
  });

  test('should delete a forecast row', async ({ page }) => {
    // Create a test forecast
    const testProj = testProjects.find(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProj.department_id);

    await createTestForecast({
      departmentId: dept.id.toString(),
      projectId: testProj.id.toString(),
      projectName: 'Delete Me',
      profitCenter: 'PC-DEL-001',
      wbs: 'WBS-DEL',
      account: 'ACC-DEL-001',
    });

    // Reload and select department
    await page.reload();
    await waitForDashboardLoad(page);

    // Select department
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();
    await page.waitForTimeout(2000);

    // Find the forecast in the table
    const liveTable = page.locator('.forecast-input-section table');
    await expect(liveTable).toContainText('Delete Me');

    // Set up dialog handler for confirm
    page.on('dialog', dialog => dialog.accept());

    // Click delete button
    const deleteButton = liveTable.locator('button:has-text("Delete")').first();
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Forecast should be gone
    await expect(liveTable).not.toContainText('Delete Me');
  });

  test('should edit yearly sum and distribute to all months', async ({ page }) => {
    // Create a test forecast
    const testProj = testProjects.find(p => p.id === 9 || p.id === 10);
    const dept = testDepartments.find(d => d.id === testProj.department_id);

    await createTestForecast({
      departmentId: dept.id.toString(),
      projectId: testProj.id.toString(),
      projectName: 'Yearly Sum Test',
      profitCenter: 'PC-YEAR-001',
      wbs: 'WBS-YEAR',
      account: 'ACC-YEAR-001',
    });

    // Reload and select department
    await page.reload();
    await waitForDashboardLoad(page);

    // Select department
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(300);
    await page.locator(`.ant-select-item-option:has-text("${dept.name}")`).first().click();
    await page.waitForTimeout(2000);

    // Find the live forecasts table
    const liveTable = page.locator('.forecast-input-section table');
    const firstRow = liveTable.locator('tbody tr').filter({hasNotText: 'Click to add'}).first();
    await expect(firstRow).toBeVisible();

    // Find all numeric cells, the last one before actions should be YEARLY SUM
    const numericCells = firstRow.locator('.cell-number');
    const yearlySumCell = numericCells.last();
    await expect(yearlySumCell).toBeVisible();

    // Click to edit
    await yearlySumCell.click();
    await page.waitForTimeout(500);

    // Should see an input field
    const input = firstRow.locator('input[type="number"]').last();
    await expect(input).toBeVisible();

    // Change to 1,200,000 (should distribute 100,000 per month)
    await input.fill('1200000');
    await input.press('Enter');

    // Wait for update to process
    await page.waitForTimeout(3000);

    // Verify one of the month cells was updated (should show distributed value)
    // Just check that the row contains the expected value
    await expect(firstRow).toContainText('100');
  });

  test('should display forecasting dimension selector', async ({ page }) => {
    // Verify dimension selector is visible
    await expect(page.locator('text=SELECT FORECASTING DIMENSION')).toBeVisible();

    // Verify all three options are present
    await expect(page.locator('.dimension-option:has-text("By Account")')).toBeVisible();
    await expect(page.locator('.dimension-option:has-text("By WBS Number")')).toBeVisible();
    await expect(page.locator('.dimension-option:has-text("By Project")')).toBeVisible();

    // Click on "By WBS Number"
    await page.locator('.dimension-option:has-text("By WBS Number")').click();
    await page.waitForTimeout(300);

    // Should have selected class
    await expect(page.locator('.dimension-option:has-text("By WBS Number")')).toHaveClass(/selected/);
  });
});
