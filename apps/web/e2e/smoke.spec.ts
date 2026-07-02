import { test, expect } from '@playwright/test';

test('home page loads landing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome to Parity')).toBeVisible();
});

test('markets page loads', async ({ page }) => {
  await page.goto('/markets');
  await expect(page.getByRole('heading', { name: 'Markets' })).toBeVisible();
});

test('login page shows OAuth options', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Continue with Google')).toBeVisible();
});
