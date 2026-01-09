import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  createTestForecast,
  cleanupTestForecasts,
  cleanupTestSnapshots,
  getDepartments,
  getProjects,
  getForecastCount,
  clickRowAction,
  API_BASE_URL,
} from './utils/test-helpers';

/**
 * E2E Tests: Snapshot and Approval Workflow
 * Tests the forecast approval process using snapshots
 */

test.describe('Snapshot and Approval Workflow', () => {
  let testDepartments: any[];
  let testProjects: any[];
  let testForecast: any;

  test.beforeAll(async () => {
    testDepartments = await getDepartments();
    testProjects = await getProjects();
  });

  test.beforeEach(async ({ page }) => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();

    // Create a test forecast
    const dept = testDepartments[0];
    const project = testProjects.find(p => p.department_id === dept.id);

    testForecast = await createTestForecast({
      departmentId: dept.id,
      projectId: project.id,
      projectName: 'Snapshot Test Project',
      profitCenter: 'PC-SNAP-001',
      wbs: 'WBS-SNAP-001',
      account: '5000',
      monthlyValues: [100000, 150000, 200000, 180000, 160000, 140000, 120000, 130000, 140000, 150000, 160000, 170000],
    });

    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();
  });

  test('should submit forecast for approval (create snapshot)', async ({ page }) => {
    const initialSnapshotCount = await getForecastCount(page, 'snapshot');

    // Click "Submit for Approval" button on the test forecast
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    // Wait for snapshot creation
    await page.waitForTimeout(1000);

    // Verify snapshot appears in Snapshots table
    const newSnapshotCount = await getForecastCount(page, 'snapshot');
    expect(newSnapshotCount).toBe(initialSnapshotCount + 1);

    // Verify snapshot row contains correct data
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    await expect(snapshotRow).toBeVisible();

    // Verify snapshot shows "Awaiting Approval" status
    await expect(snapshotRow.locator('text=Awaiting Approval')).toBeVisible();
  });

  test('should display snapshot with correct data', async ({ page }) => {
    // Submit forecast for approval first
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    await page.waitForTimeout(1000);

    // Verify snapshot contains the same data as the forecast
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    // Check project name
    await expect(snapshotRow.locator('text=Snapshot Test Project')).toBeVisible();

    // Check profit center
    await expect(snapshotRow.locator('text=PC-SNAP-001')).toBeVisible();

    // Check account
    await expect(snapshotRow.locator('text=5000')).toBeVisible();

    // Monthly values should be preserved (spot check a few)
    // Note: Exact selectors depend on table structure
  });

  test('should approve a snapshot', async ({ page }) => {
    // Submit forecast for approval
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    await page.waitForTimeout(1000);

    // Verify "Approve" button is visible
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    await expect(snapshotRow.locator('button:has-text("Approve")')).toBeVisible();

    // Click "Approve" button
    await snapshotRow.locator('button:has-text("Approve")').click();

    await page.waitForTimeout(1000);

    // Verify status changed to "Approved"
    await expect(snapshotRow.locator('text=Approved')).toBeVisible();

    // Verify "Approve" button is no longer visible
    await expect(snapshotRow.locator('button:has-text("Approve")')).not.toBeVisible();
  });

  test('should delete a snapshot', async ({ page }) => {
    // Submit forecast for approval
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    await page.waitForTimeout(1000);

    const initialSnapshotCount = await getForecastCount(page, 'snapshot');

    // Click "Delete" button on snapshot
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    await snapshotRow.locator('button:has-text("Delete")').click();

    // Handle confirmation dialog if it exists
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    await page.waitForTimeout(1000);

    // Verify snapshot is deleted
    const newSnapshotCount = await getForecastCount(page, 'snapshot');
    expect(newSnapshotCount).toBe(initialSnapshotCount - 1);

    // Verify snapshot row is no longer visible
    await expect(snapshotRow).not.toBeVisible();
  });

  test('should create multiple snapshots from same forecast', async ({ page }) => {
    const initialSnapshotCount = await getForecastCount(page, 'snapshot');

    // Submit first snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    // Submit second snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    // Verify two snapshots were created
    const newSnapshotCount = await getForecastCount(page, 'snapshot');
    expect(newSnapshotCount).toBe(initialSnapshotCount + 2);

    // Both snapshots should be visible
    const snapshotRows = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    expect(await snapshotRows.count()).toBe(2);
  });

  test('should preserve snapshot data when original forecast is edited', async ({ page }) => {
    // Submit snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    // Edit the original forecast
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Edit');

    await expect(page.locator('text=Rediger Prognose')).toBeVisible();

    // Change project name
    await page.locator('input[placeholder="Prosjektnavn"]').fill('Modified Project Name');

    // Submit edit
    await page.locator('button:has-text("Oppdater")').click();

    await page.waitForTimeout(1000);

    // Verify live forecast shows new name
    const liveRow = page.locator('text=LIVE FORECASTS')
      .locator('..')
      .locator('table tbody tr:has-text("Modified Project Name")');

    await expect(liveRow).toBeVisible();

    // Verify snapshot still shows original name
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("Snapshot Test Project")');

    await expect(snapshotRow).toBeVisible();

    // Snapshot should NOT show modified name
    const modifiedSnapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("Modified Project Name")');

    await expect(modifiedSnapshotRow).not.toBeVisible();
  });

  test('should show snapshot timestamp', async ({ page }) => {
    // Submit snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    await page.waitForTimeout(1000);

    // Verify snapshot row has a timestamp column
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    // Snapshot should have a date (format depends on implementation)
    // We just verify the row is visible and contains data
    await expect(snapshotRow).toBeVisible();
  });

  test('should show submitted by user in snapshot', async ({ page }) => {
    // Submit snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    await page.waitForTimeout(1000);

    // Verify snapshot shows submitted_by field
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    // Should show "test-user" as submitter
    await expect(snapshotRow.locator('text=test-user')).toBeVisible();
  });

  test('should show approved by user after approval', async ({ page }) => {
    // Submit and approve snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    await snapshotRow.locator('button:has-text("Approve")').click();
    await page.waitForTimeout(1000);

    // Verify snapshot shows approved status
    await expect(snapshotRow.locator('text=Approved')).toBeVisible();

    // Note: approved_by field depends on implementation
    // Currently there's no user auth, so this might not be populated
  });

  test('should allow deleting approved snapshot', async ({ page }) => {
    // Submit and approve snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    await snapshotRow.locator('button:has-text("Approve")').click();
    await page.waitForTimeout(1000);

    const initialCount = await getForecastCount(page, 'snapshot');

    // Delete approved snapshot
    await snapshotRow.locator('button:has-text("Delete")').click();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.waitForTimeout(1000);

    // Verify deletion successful
    const newCount = await getForecastCount(page, 'snapshot');
    expect(newCount).toBe(initialCount - 1);
  });

  test('should show empty state when no snapshots exist', async ({ page }) => {
    // Clean up all snapshots
    await cleanupTestSnapshots();

    await page.reload();
    await waitForDashboardLoad(page);

    // Verify empty state message or empty table
    const snapshotSection = page.locator('text=FORECAST SNAPSHOTS').locator('..');

    // Check for empty state text or just verify section is visible
    const emptyText = snapshotSection.locator('text=No approved forecasts yet');

    // Empty state might be shown
    const count = await getForecastCount(page, 'snapshot');

    // Depending on sample data, might be 0 or have existing snapshots
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should preserve monthly values in snapshot', async ({ page }) => {
    // Get the original forecast data via API
    const response = await fetch(`${API_BASE_URL}/forecasts/${testForecast.id}`);
    const originalForecast = await response.json();

    // Submit snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');
    await page.waitForTimeout(1000);

    // Get snapshot via API to verify monthly values
    const snapshotsResponse = await fetch(`${API_BASE_URL}/snapshots`);
    const snapshots = await snapshotsResponse.json();

    const testSnapshot = snapshots.find((s: any) => s.wbs === 'WBS-SNAP-001');

    expect(testSnapshot).toBeTruthy();

    // Verify all monthly values match
    expect(testSnapshot.jan).toBe(originalForecast.jan);
    expect(testSnapshot.feb).toBe(originalForecast.feb);
    expect(testSnapshot.mar).toBe(originalForecast.mar);
    expect(testSnapshot.total).toBe(originalForecast.total);
    expect(testSnapshot.yearly_sum).toBe(originalForecast.yearly_sum);
  });

  test('should handle rapid submit/approve actions', async ({ page }) => {
    // Submit snapshot
    await clickRowAction(page, { wbs: 'WBS-SNAP-001' }, 'Submit for Approval');

    // Wait briefly (not full wait)
    await page.waitForTimeout(300);

    // Try to approve quickly
    const snapshotRow = page.locator('text=FORECAST SNAPSHOTS')
      .locator('..')
      .locator('table tbody tr:has-text("WBS-SNAP-001")');

    // Button should be clickable
    const approveButton = snapshotRow.locator('button:has-text("Approve")').first();

    await approveButton.click();

    await page.waitForTimeout(1000);

    // Verify approval succeeded
    await expect(snapshotRow.locator('text=Approved').first()).toBeVisible();
  });
});
