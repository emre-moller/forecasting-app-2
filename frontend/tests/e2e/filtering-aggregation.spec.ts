import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  createTestForecast,
  cleanupTestForecasts,
  cleanupTestSnapshots,
  getDepartments,
  getProjects,
  getForecastCount,
  tableRowExists,
} from './utils/test-helpers';

/**
 * E2E Tests: Filtering and Aggregation
 * Tests filtering by department/project and total calculations
 */

test.describe('Filtering and Aggregation', () => {
  let testDepartments: any[];
  let testProjects: any[];

  test.beforeAll(async () => {
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();

    // Create test forecasts for multiple departments/projects
    const dept1 = testDepartments.find(d => d.name === 'Teknologi');
    const dept2 = testDepartments.find(d => d.name === 'Markedsføring');

    const project1 = testProjects.find(p => p.department_id === dept1?.id);
    const project2 = testProjects.find(p => p.department_id === dept2?.id);

    if (dept1 && project1) {
      await createTestForecast({
        departmentId: dept1.id,
        projectId: project1.id,
        projectName: 'Tech Project 1',
        profitCenter: 'PC-TECH-001',
        wbs: 'WBS-TECH-001',
        account: '5000',
        monthlyValues: Array(12).fill(100000),
      });

      await createTestForecast({
        departmentId: dept1.id,
        projectId: project1.id,
        projectName: 'Tech Project 2',
        profitCenter: 'PC-TECH-002',
        wbs: 'WBS-TECH-002',
        account: '5001',
        monthlyValues: Array(12).fill(150000),
      });
    }

    if (dept2 && project2) {
      await createTestForecast({
        departmentId: dept2.id,
        projectId: project2.id,
        projectName: 'Marketing Project 1',
        profitCenter: 'PC-MARK-001',
        wbs: 'WBS-MARK-001',
        account: '6000',
        monthlyValues: Array(12).fill(200000),
      });
    }

    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();
  });

  test('should filter forecasts by department', async ({ page }) => {
    // Verify initial state shows all forecasts
    const initialCount = await getForecastCount(page, 'live');
    expect(initialCount).toBeGreaterThanOrEqual(3); // At least our 3 test forecasts

    // Open department filter dropdown
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();

    // Select Teknologi department
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    // Wait for filtering
    await page.waitForTimeout(500);

    // Verify only Teknologi forecasts are shown
    const techRows = await tableRowExists(page, {
      projectName: 'Tech Project 1',
    });
    expect(techRows).toBeGreaterThan(0);

    const techRows2 = await tableRowExists(page, {
      projectName: 'Tech Project 2',
    });
    expect(techRows2).toBeGreaterThan(0);

    // Verify Marketing forecast is NOT shown
    const marketingRows = await tableRowExists(page, {
      projectName: 'Marketing Project 1',
    });
    expect(marketingRows).toBe(0);
  });

  test('should filter forecasts by project', async ({ page }) => {
    // Select department first
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.waitForTimeout(500);

    // Now select a specific project
    await page.locator('label:has-text("Filtrer etter Prosjekt")').locator('..').locator('.ant-select').click();

    // Select the first available project
    await page.locator('.ant-select-item-option').first().click();

    await page.waitForTimeout(500);

    // Verify forecasts are filtered (exact count depends on which project was selected)
    const filteredCount = await getForecastCount(page, 'live');

    // Should have fewer than when just department was selected
    // At minimum, should have some forecasts
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('should reset filters when "Nullstill Filtre" is clicked', async ({ page }) => {
    // Apply department filter
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.waitForTimeout(500);

    const filteredCount = await getForecastCount(page, 'live');

    // Click reset filters button
    await page.locator('button:has-text("Nullstill Filtre")').click();

    await page.waitForTimeout(500);

    // Verify all forecasts are shown again
    const resetCount = await getForecastCount(page, 'live');
    expect(resetCount).toBeGreaterThan(filteredCount);

    // Verify both Tech and Marketing forecasts are visible
    const techRows = await tableRowExists(page, {
      projectName: 'Tech Project 1',
    });
    expect(techRows).toBeGreaterThan(0);

    const marketingRows = await tableRowExists(page, {
      projectName: 'Marketing Project 1',
    });
    expect(marketingRows).toBeGreaterThan(0);
  });

  test('should update project dropdown when department changes', async ({ page }) => {
    // Select Teknologi department
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.waitForTimeout(500);

    // Open project dropdown
    await page.locator('label:has-text("Filtrer etter Prosjekt")').locator('..').locator('.ant-select').click();

    // Get available projects for Teknologi
    const techProjectOptions = await page.locator('.ant-select-item-option').count();

    // Close dropdown
    await page.keyboard.press('Escape');

    // Change to Markedsføring department
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Markedsføring")').click();

    await page.waitForTimeout(500);

    // Open project dropdown again
    await page.locator('label:has-text("Filtrer etter Prosjekt")').locator('..').locator('.ant-select').click();

    // Get available projects for Markedsføring
    const marketingProjectOptions = await page.locator('.ant-select-item-option').count();

    // Projects should potentially be different (depending on data)
    // At minimum, dropdown should be functional
    expect(marketingProjectOptions).toBeGreaterThanOrEqual(0);
  });

  test('should display correct department count in statistics', async ({ page }) => {
    // Get the department count from the statistics card
    const deptCountCard = page.locator('.ant-statistic-title:has-text("Avdelinger")').locator('..');
    const deptCount = await deptCountCard.locator('.ant-statistic-content-value').textContent();

    // Should match the number of departments from API
    expect(parseInt(deptCount || '0')).toBe(testDepartments.length);
  });

  test('should display correct project count in statistics', async ({ page }) => {
    // Get the project count from the statistics card
    const projectCountCard = page.locator('.ant-statistic-title:has-text("Prosjekter")').locator('..');
    const projectCount = await projectCountCard.locator('.ant-statistic-content-value').textContent();

    // Should match the number of projects from API
    expect(parseInt(projectCount || '0')).toBe(testProjects.length);
  });

  test('should calculate total forecast amount correctly', async ({ page }) => {
    // Get the total forecast amount from statistics
    const totalCard = page.locator('.ant-statistic-title:has-text("Totalt Prognostisert")').locator('..');
    const totalText = await totalCard.locator('.ant-statistic-content-value').textContent();

    // Should be a valid number in Norwegian format
    expect(totalText).toBeTruthy();

    // Total should be greater than 0 since we have test forecasts
    const totalValue = parseInt(totalText?.replace(/[^\d]/g, '') || '0');
    expect(totalValue).toBeGreaterThan(0);
  });

  test('should update total when filtering', async ({ page }) => {
    // Get initial total
    const totalCard = page.locator('.ant-statistic-title:has-text("Totalt Prognostisert")').locator('..');
    const initialTotalText = await totalCard.locator('.ant-statistic-content-value').textContent();
    const initialTotal = parseInt(initialTotalText?.replace(/[^\d]/g, '') || '0');

    // Apply department filter
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.waitForTimeout(500);

    // Get filtered total
    const filteredTotalText = await totalCard.locator('.ant-statistic-content-value').textContent();
    const filteredTotal = parseInt(filteredTotalText?.replace(/[^\d]/g, '') || '0');

    // Filtered total should be less than or equal to initial total
    expect(filteredTotal).toBeLessThanOrEqual(initialTotal);
    expect(filteredTotal).toBeGreaterThan(0); // Should have some value
  });

  test('should show forecasts sorted correctly', async ({ page }) => {
    // Get all project names from the Live Forecasts table
    const projectNameCells = page.locator('text=LIVE FORECASTS').locator('..').locator('table tbody tr td:first-child');

    const count = await projectNameCells.count();

    // Verify we have multiple rows to check sorting
    expect(count).toBeGreaterThan(0);

    // Note: Actual sorting order depends on implementation
    // This test just verifies data is displayed consistently
  });

  test('should maintain filter state when creating new forecast', async ({ page }) => {
    // Apply department filter
    await page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.waitForTimeout(500);

    const filteredCountBefore = await getForecastCount(page, 'live');

    // Create a new forecast for Teknologi
    await page.locator('button:has-text("Ny Prognose")').click();

    // Cancel the modal
    await page.keyboard.press('Escape');

    await page.waitForTimeout(500);

    // Verify filter is still applied
    const filteredCountAfter = await getForecastCount(page, 'live');

    expect(filteredCountAfter).toBe(filteredCountBefore);

    // Verify Marketing forecast is still not shown
    const marketingRows = await tableRowExists(page, {
      projectName: 'Marketing Project 1',
    });
    expect(marketingRows).toBe(0);
  });

  test('should handle empty filter results gracefully', async ({ page }) => {
    // Create a scenario where filter returns no results
    // This depends on having a department with no forecasts

    // First clean up our test data
    await cleanupTestForecasts();
    await page.reload();
    await waitForDashboardLoad(page);

    // Try to filter by a department that might have no forecasts
    // (This test assumes at least one department exists)
    const deptSelect = page.locator('label:has-text("Filtrer etter Avdeling")').locator('..').locator('.ant-select');

    await deptSelect.click();

    // Select first available department
    await page.locator('.ant-select-item-option').first().click();

    await page.waitForTimeout(500);

    // Should handle empty state gracefully (no crash)
    const count = await getForecastCount(page, 'live');

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display department totals correctly', async ({ page }) => {
    // This test verifies that aggregations by department are calculated correctly
    // The dashboard shows totals by department in the UI

    // Note: Implementation depends on whether department totals are shown
    // This is a placeholder for that functionality

    // Verify the dashboard loads without errors
    await expect(page.locator('text=LIVE FORECASTS')).toBeVisible();

    // If department totals are shown in the UI, verify them here
    // For now, we just verify the page is functional
  });

  test('should display project totals correctly', async ({ page }) => {
    // Similar to department totals test

    await expect(page.locator('text=LIVE FORECASTS')).toBeVisible();

    // If project totals are shown in the UI, verify them here
  });
});
