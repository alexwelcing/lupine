import { test, expect } from '@playwright/test';

test.describe('Lupine Site E2E', () => {
  test('should load the home page correctly', async ({ page }) => {
    // Navigate to the root URL
    await page.goto('/');

    // Check that the title is correct
    // We expect the title to be something related to Lupine (Vite + React is the default usually if not changed, let's just check title exists for now or check text on page)
    await expect(page).toHaveTitle(/Lupine/i);

    // Check for a known structural element (like the banner or header)
    // We'll just verify the page body is visible and contains some text
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check that there are no immediate rendering crashes (if it was blank it wouldn't have elements)
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});
