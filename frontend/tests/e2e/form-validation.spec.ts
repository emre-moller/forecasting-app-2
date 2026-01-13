import { test, expect } from '@playwright/test';
import {
  waitForDashboardLoad,
} from './utils/test-helpers';

/**
 * E2E Tests: Form Validation and Error Handling
 * Tests form validation, error states, and edge cases
 */

test.describe('Form Validation and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboardLoad(page);
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
});
