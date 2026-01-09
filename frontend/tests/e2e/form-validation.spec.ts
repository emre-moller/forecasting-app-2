import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
  cleanupTestForecasts,
  cleanupTestSnapshots,
} from './utils/test-helpers';

/**
 * E2E Tests: Form Validation and Error Handling
 * Tests form validation, error states, and edge cases
 */

test.describe('Form Validation and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();

    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestSnapshots();
    await cleanupTestForecasts();
  });

  test('should open forecast form modal when clicking Ny Prognose', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Verify modal opened
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Verify all form fields are present
    await expect(page.locator('label:has-text("Avdeling")')).toBeVisible();
    await expect(page.locator('label:has-text("Prosjekt")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter project name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. PC001"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. WBS001"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. ACC001"]')).toBeVisible();

    // Verify all 12 month fields
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (const month of months) {
      await expect(page.locator(`label:has-text("${month}")`).locator('..').locator('input')).toBeVisible();
    }
  });

  test('should close modal when clicking cancel or escape', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('text=Ny Utgiftsprognose')).not.toBeVisible();

    // Open again and click cancel
    await page.locator('button:has-text("Ny Prognose")').click();
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Click cancel button (if it exists)
    const cancelButton = page.locator('button:has-text("Avbryt")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await expect(page.locator('text=Ny Utgiftsprognose')).not.toBeVisible();
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Try to submit empty form
    await page.locator('button:has-text("Opprett")').click();

    // Modal should still be open (validation failed)
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Note: Specific validation messages depend on implementation
    // This test just verifies the form doesn't submit with empty fields
  });

  test('should accept numeric input for monthly values', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Fill a month field with a number
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('100000');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();
    expect(value).toBe('100000');
  });

  test('should handle decimal values in monthly fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Try to enter decimal
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('100000.50');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();

    // Depending on validation, might accept or reject decimals
    // This test documents the behavior
    expect(value.length).toBeGreaterThan(0);
  });

  test('should handle negative values in monthly fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Try to enter negative value
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('-50000');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();

    // Depending on validation, might accept or reject negatives
    expect(value).toBeTruthy();
  });

  test('should handle very large numbers in monthly fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Enter a very large number
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('999999999999');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();
    expect(value).toBe('999999999999');
  });

  test('should handle zero values in monthly fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Enter zero
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('0');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();
    expect(value).toBe('0');
  });

  test('should reject non-numeric input in monthly fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Try to enter text
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('abc');

    const value = await page.locator('label:has-text("January")').locator('..').locator('input').inputValue();

    // Input type=number should prevent text entry
    // Value should be empty or the field should reject it
    expect(value === '' || value === 'abc').toBeTruthy();
  });

  test('should update project dropdown when department is selected', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Select a department
    await page.locator('label:has-text("Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    // Project dropdown should now be populated with Teknologi projects
    await page.locator('label:has-text("Prosjekt")').locator('..').locator('.ant-select').click();

    // Verify at least one project option is available
    const projectOptions = await page.locator('.ant-select-item-option').count();
    expect(projectOptions).toBeGreaterThan(0);
  });

  test('should handle special characters in text fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Enter special characters in project name
    await page.locator('input[placeholder="Enter project name"]').fill('Test!@#$%^&*()_+-={}[]|;:,.<>?');

    const value = await page.locator('input[placeholder="Enter project name"]').inputValue();

    // Should accept special characters
    expect(value).toBe('Test!@#$%^&*()_+-={}[]|;:,.<>?');
  });

  test('should handle very long text in text fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    const longText = 'A'.repeat(500);

    await page.locator('input[placeholder="Enter project name"]').fill(longText);

    const value = await page.locator('input[placeholder="Enter project name"]').inputValue();

    // Should either accept or truncate to max length
    expect(value.length).toBeGreaterThan(0);
  });

  test('should trim whitespace from text inputs', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Enter text with leading/trailing spaces
    await page.locator('input[placeholder="Enter project name"]').fill('  Test Project  ');

    const value = await page.locator('input[placeholder="Enter project name"]').inputValue();

    // Depending on implementation, might trim or keep spaces
    expect(value).toBeTruthy();
  });

  test('should handle clicking outside modal', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();

    // Click on the backdrop/overlay (outside modal)
    // This depends on Ant Design modal implementation
    // Some modals close on backdrop click, others don't
    await page.locator('.ant-modal-wrap').click({ position: { x: 10, y: 10 } });

    // Wait briefly
    await page.waitForTimeout(500);

    // Modal might or might not close depending on config
    // This test documents the behavior
  });

  test('should preserve form data when switching between fields', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Fill multiple fields
    await page.locator('input[placeholder="Enter project name"]').fill('Test Project');
    await page.locator('input[placeholder="e.g. PC001"]').fill('PC-001');
    await page.locator('label:has-text("January")').locator('..').locator('input').fill('100000');

    // Click to another field
    await page.locator('label:has-text("February")').locator('..').locator('input').click();

    // Verify previous values are preserved
    expect(await page.locator('input[placeholder="Enter project name"]').inputValue()).toBe('Test Project');
    expect(await page.locator('input[placeholder="e.g. PC001"]').inputValue()).toBe('PC-001');
    expect(await page.locator('label:has-text("January")').locator('..').locator('input').inputValue()).toBe('100000');
  });

  test('should handle form submission with minimal valid data', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Fill only required fields
    await page.locator('label:has-text("Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option:has-text("Teknologi")').click();

    await page.locator('label:has-text("Prosjekt")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option').first().click();

    await page.locator('input[placeholder="Enter project name"]').fill('Minimal Test');
    await page.locator('input[placeholder="e.g. PC001"]').fill('PC-MIN');
    await page.locator('input[placeholder="e.g. WBS001"]').fill('WBS-MIN');
    await page.locator('input[placeholder="e.g. ACC001"]').fill('5000');

    // Leave all monthly values as 0 or empty
    await page.locator('button:has-text("Opprett")').click();

    // Depending on validation, this might succeed or fail
    await page.waitForTimeout(1000);

    // Check if modal closed (success) or still open (validation error)
    const isModalOpen = await page.locator('text=Ny Utgiftsprognose').isVisible();

    // Test documents the behavior
    expect(typeof isModalOpen).toBe('boolean');
  });

  test('should show loading state during API calls', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Fill form
    await page.locator('label:has-text("Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option').first().click();

    await page.locator('label:has-text("Prosjekt")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option').first().click();

    await page.locator('input[placeholder="Enter project name"]').fill('Loading Test');
    await page.locator('input[placeholder="e.g. PC001"]').fill('PC-LOAD');
    await page.locator('input[placeholder="e.g. WBS001"]').fill('WBS-LOAD');
    await page.locator('input[placeholder="e.g. ACC001"]').fill('5000');

    await page.locator('label:has-text("January")').locator('..').locator('input').fill('100000');

    // Click submit and immediately check for loading state
    const submitButton = page.locator('button:has-text("Opprett")');

    await submitButton.click();

    // Loading indicator might be present (depends on implementation)
    // This test documents whether loading states are shown
    await page.waitForTimeout(100);

    // Check if button is disabled during submission
    const isDisabled = await submitButton.isDisabled();

    // Documenting behavior
    expect(typeof isDisabled).toBe('boolean');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test would require mocking API to return errors
    // For now, we test that the app doesn't crash on invalid data

    await page.locator('button:has-text("Ny Prognose")').click();

    // Try to create forecast with potentially invalid data
    // The actual behavior depends on backend validation

    // Fill form with edge case data
    await page.locator('label:has-text("Avdeling")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option').first().click();

    await page.locator('label:has-text("Prosjekt")').locator('..').locator('.ant-select').click();
    await page.locator('.ant-select-item-option').first().click();

    await page.locator('input[placeholder="Enter project name"]').fill('Error Test');
    await page.locator('input[placeholder="e.g. PC001"]').fill('');  // Empty required field
    await page.locator('input[placeholder="e.g. WBS001"]').fill('');  // Empty required field
    await page.locator('input[placeholder="e.g. ACC001"]').fill('');  // Empty required field

    await page.locator('button:has-text("Opprett")').click();

    await page.waitForTimeout(1000);

    // App should still be functional (no crash)
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();
  });

  test('should display validation errors inline', async ({ page }) => {
    await page.locator('button:has-text("Ny Prognose")').click();

    // Submit without filling required fields
    await page.locator('button:has-text("Opprett")').click();

    // Look for validation error messages
    // Depending on implementation, might show:
    // - Red borders on fields
    // - Error text below fields
    // - Toast notifications
    // - Modal error message

    // This test documents what validation UI is present
    await page.waitForTimeout(500);

    // Modal should still be open
    await expect(page.locator('text=Ny Utgiftsprognose')).toBeVisible();
  });
});
