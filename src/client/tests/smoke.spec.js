import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('#root')).toBeAttached();
});

test('login page has expected elements', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('body')).not.toBeEmpty();
});
