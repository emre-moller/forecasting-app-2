import { Page, expect } from '@playwright/test';

/**
 * Test Helpers and Utilities for E2E Tests
 */

// API Base URL
export const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Wait for the dashboard to load completely
 */
export async function waitForDashboardLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for the main header and tables to be visible
  await expect(page.locator('h1:has-text("Financial Forecasting Input Tool")')).toBeVisible();
  await expect(page.locator('text=FORECAST SNAPSHOTS')).toBeVisible();
  await expect(page.locator('text=Monthly Forecast Input')).toBeVisible();
}

/**
 * Create a test forecast via API
 * If a forecast already exists for this project/year, delete it first
 */
export async function createTestForecast(data: {
  departmentId: string;
  projectId: string;
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;
  monthlyValues?: number[];
  year?: number;
}) {
  const monthlyValues = data.monthlyValues || Array(12).fill(100000);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const monthlyData = months.reduce((acc, month, index) => {
    acc[month] = monthlyValues[index];
    return acc;
  }, {} as Record<string, number>);

  const total = monthlyValues.reduce((sum, val) => sum + val, 0);
  const year = data.year || new Date().getFullYear();
  const forecastId = `${data.projectId}_${year}`;

  // Delete existing forecast if it exists
  try {
    await fetch(`${API_BASE_URL}/forecasts/${forecastId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // Ignore errors - forecast might not exist
  }

  const response = await fetch(`${API_BASE_URL}/forecasts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      department_id: parseInt(data.departmentId),
      project_id: parseInt(data.projectId),
      project_name: data.projectName,
      profit_center: data.profitCenter,
      wbs: data.wbs,
      account: data.account,
      ...monthlyData,
      total,
      yearly_sum: total,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to create test forecast:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`Failed to create test forecast: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Created forecast:', result);
  return result;
}

/**
 * Delete all test forecasts (clean up)
 * Cleans up forecasts for test project IDs (9, 10, and any with test-related names)
 */
export async function cleanupTestForecasts() {
  try {
    const response = await fetch(`${API_BASE_URL}/forecasts`);
    if (!response.ok) {
      console.error('Failed to fetch forecasts for cleanup');
      return;
    }
    const forecasts = await response.json();

    for (const forecast of forecasts) {
      // Identify test forecasts by project ID (9, 10 are test projects) or name patterns
      const isTestProject = parseInt(forecast.project_id) === 9 || parseInt(forecast.project_id) === 10;
      const hasTestPattern = forecast.wbs?.includes('TEST') ||
          forecast.wbs?.includes('SNAP') ||
          forecast.wbs?.includes('BULK') ||
          forecast.wbs?.includes('BATCH') ||
          forecast.wbs?.includes('CNT') ||
          forecast.wbs?.includes('APPR') ||
          forecast.wbs?.includes('NSB') ||
          forecast.project_name?.includes('Test') ||
          forecast.project_name?.includes('E2E') ||
          forecast.project_name?.includes('Bulk') ||
          forecast.project_name?.includes('Batch') ||
          forecast.project_name?.includes('Count') ||
          forecast.project_name?.includes('Approve') ||
          forecast.project_name?.includes('No Submit Button');

      if (isTestProject || hasTestPattern) {
        await fetch(`${API_BASE_URL}/forecasts/${forecast.id}`, {
          method: 'DELETE',
        });
      }
    }
  } catch (error) {
    console.error('Error cleaning up test forecasts:', error);
  }
}

/**
 * Delete all test snapshots (clean up)
 */
export async function cleanupTestSnapshots() {
  try {
    const response = await fetch(`${API_BASE_URL}/snapshots`);
    if (!response.ok) {
      console.error('Failed to fetch snapshots for cleanup');
      return;
    }
    const snapshots = await response.json();

    for (const snapshot of snapshots) {
      // Delete snapshots from test users or test projects
      const isTestSnapshot = snapshot.submitted_by === 'test-user' ||
        parseInt(snapshot.project_id) === 9 ||
        parseInt(snapshot.project_id) === 10;

      if (isTestSnapshot) {
        await fetch(`${API_BASE_URL}/snapshots/${snapshot.id}`, {
          method: 'DELETE',
        });
      }
    }
  } catch (error) {
    console.error('Error cleaning up test snapshots:', error);
  }
}

/**
 * Get all departments
 */
export async function getDepartments() {
  const response = await fetch(`${API_BASE_URL}/departments`);
  return response.json();
}

/**
 * Get all projects
 */
export async function getProjects() {
  const response = await fetch(`${API_BASE_URL}/projects`);
  return response.json();
}

/**
 * Fill the forecast form modal
 */
export async function fillForecastForm(page: Page, data: {
  department: string;
  project: string;
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;
  monthlyValues?: number[];
}) {
  const monthlyValues = data.monthlyValues || Array(12).fill(100000);

  // Wait for departments to load
  await page.waitForTimeout(500);

  // Select department using keyboard navigation
  await page.getByTestId('department-select').click();
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown'); // Open dropdown and move to first item
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter'); // Select first department
  await page.waitForTimeout(500);

  // Wait for project dropdown to become enabled (it's disabled until department is selected)
  await page.waitForTimeout(500);

  // Select project using keyboard navigation
  await page.getByTestId('project-select').click();
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown'); // Open dropdown and move to first item
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter'); // Select first project
  await page.waitForTimeout(300);

  // Fill project name
  await page.locator('input[placeholder="Enter project name"]').fill(data.projectName);

  // Fill profit center
  await page.locator('input[placeholder="e.g. PC001"]').fill(data.profitCenter);

  // Fill WBS
  await page.locator('input[placeholder="e.g. WBS001"]').fill(data.wbs);

  // Fill account
  await page.locator('input[placeholder="e.g. ACC001"]').fill(data.account);

  // Fill monthly values - use nth() for InputNumber fields (they're in order Jan-Dec)
  const monthInputs = page.locator('.ant-input-number-input');
  for (let i = 0; i < 12; i++) {
    await monthInputs.nth(i).fill(monthlyValues[i].toString());
    await page.waitForTimeout(50); // Small delay between fills
  }
}

/**
 * Format Norwegian currency
 */
export function formatNOK(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse Norwegian currency back to number
 */
export function parseNOK(text: string): number {
  // Remove "kr", spaces, and dots, then parse
  return parseInt(text.replace(/[kr\s.]/g, '').replace(',', '.'));
}

/**
 * Check if a table row exists with specific content
 */
export async function tableRowExists(page: Page, rowData: Partial<{
  projectName: string;
  profitCenter: string;
  wbs: string;
  account: string;
}>) {
  let selector = 'table tbody tr';

  if (rowData.projectName) {
    selector += `:has-text("${rowData.projectName}")`;
  }
  if (rowData.profitCenter) {
    selector += `:has-text("${rowData.profitCenter}")`;
  }
  if (rowData.wbs) {
    selector += `:has-text("${rowData.wbs}")`;
  }
  if (rowData.account) {
    selector += `:has-text("${rowData.account}")`;
  }

  return page.locator(selector).count();
}

/**
 * Get forecast count from table
 */
export async function getForecastCount(page: Page, tableType: 'live' | 'snapshot' = 'live') {
  const tableSelector = tableType === 'live'
    ? '.forecast-input-section table'
    : '.dashboard-section table';

  const rows = page.locator(`${tableSelector} tbody tr`).filter({hasNotText: 'Click to add'});
  return rows.count();
}

/**
 * Click action button in table row
 */
export async function clickRowAction(
  page: Page,
  rowIdentifier: { projectName?: string; wbs?: string },
  action: 'Edit' | 'Delete' | 'Approve' | 'Approve All'
) {
  let rowSelector = 'table tbody tr';

  if (rowIdentifier.projectName) {
    rowSelector += `:has-text("${rowIdentifier.projectName}")`;
  }
  if (rowIdentifier.wbs) {
    rowSelector += `:has-text("${rowIdentifier.wbs}")`;
  }

  await page.locator(rowSelector).locator(`button:has-text("${action}")`).first().click();
}
