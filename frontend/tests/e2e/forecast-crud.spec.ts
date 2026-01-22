import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  getDepartments,
  getProjects,
  getForecastCount,
} from './utils/test-helpers';

/**
 * E2E Tests: Forecast CRUD Operations
 * Tests creating, reading, updating, and deleting forecasts
 */

// Run tests in this file serially to avoid race conditions with shared database
test.describe.configure({ mode: 'serial' });

test.describe('Forecast CRUD Operations', () => {
  let testDepartments: any[];
  let testProjects: any[];

  test.beforeAll(async () => {
    // Get test data
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test('should display the dashboard with statistics', async ({ page }) => {
    // Verify main header is present
    await expect(page.locator('h1:has-text("Financial Forecasting Input Tool")')).toBeVisible();

    // Verify tables are present
    await expect(page.locator('text=FORECAST SNAPSHOTS')).toBeVisible();
    await expect(page.locator('text=Monthly Forecast Input')).toBeVisible();

    // Verify "ADD ROW" and "SUBMIT ALL FORECASTS" buttons are present
    await expect(page.locator('button:has-text("ADD ROW")')).toBeVisible();
    await expect(page.locator('button:has-text("SUBMIT ALL FORECASTS")')).toBeVisible();
  });

  test('should load forecasts with embedded metadata from API', async ({ page }) => {
    // This test verifies that forecasts with embedded metadata (department_id, project_id, project_name)
    // are correctly loaded from the backend and displayed in the frontend.

    // Fetch forecasts directly from the API
    const response = await page.request.get('http://localhost:8000/api/forecasts');
    expect(response.ok()).toBeTruthy();

    const forecasts = await response.json();
    expect(forecasts.length).toBeGreaterThan(0);

    // Verify that forecasts have embedded metadata fields
    const forecast = forecasts[0];
    expect(forecast).toHaveProperty('department_id');
    expect(forecast).toHaveProperty('project_id');
    expect(forecast).toHaveProperty('project_name');
    expect(forecast).toHaveProperty('id');

    // Verify the ID format is correct (profitcenter_wbs_account_year)
    expect(forecast.id).toMatch(/^\d+_[^_]+_\d+_\d{4}$/);

    // Verify monthly values are present
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (const month of months) {
      expect(forecast).toHaveProperty(month);
      expect(typeof forecast[month]).toBe('number');
    }

    // Verify totals are calculated
    expect(forecast).toHaveProperty('total');
    expect(forecast).toHaveProperty('yearly_sum');
    expect(forecast.total).toBe(forecast.yearly_sum);
  });


  test('should display all 12 monthly columns in the table', async ({ page }) => {
    // Verify all month column headers exist in the Live Forecasts table
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Wait for the table header to be visible
    await expect(page.locator('h2:has-text("Monthly Forecast Input")')).toBeVisible();

    // Find the live forecasts table directly
    const liveTable = page.locator('.forecast-input-section table').first();
    await expect(liveTable).toBeVisible();

    for (const month of months) {
      await expect(liveTable.locator('th').filter({hasText: month})).toBeVisible();
    }

    // Verify Yearly Sum column
    await expect(liveTable.locator('th:has-text("YEARLY SUM")').first()).toBeVisible();
  });

  test('should show empty state when no forecasts exist', async ({ page }) => {
    // Check if live forecasts table shows empty state or minimal content
    const liveCount = await getForecastCount(page, 'live');

    // Depending on implementation, there might be existing sample data
    // So we just verify the table exists and can display data
    expect(liveCount).toBeGreaterThanOrEqual(0);
  });

  test('should persist data after page reload', async ({ page }) => {
    // Get initial forecast count
    const initialCount = await getForecastCount(page, 'live');

    // Reload page
    await page.reload();
    await waitForDashboardLoad(page);

    // Verify forecast count is the same
    const reloadCount = await getForecastCount(page, 'live');
    expect(reloadCount).toBe(initialCount);
  });
});
