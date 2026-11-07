import { test, expect } from '@playwright/test';

test.describe('Public Landing Page E2E', () => {
  test('should load landing page with correct title, brand, and hero', async ({ page }) => {
    await page.goto('/');

    // Check SEO title
    await expect(page).toHaveTitle(/Northstar/i);

    // Verify brand
    const brand = page.locator('.site-nav .brand');
    await expect(brand).toBeVisible();
    await expect(brand).toContainText('NORTHSTAR');

    // Verify navigation links
    await expect(page.locator('.nav-links a:has-text("Services")')).toBeVisible();
    await expect(page.locator('.nav-links a:has-text("Our work")')).toBeVisible();
    await expect(page.locator('.nav-links a:has-text("About")')).toBeVisible();

    // Verify hero CTA
    const primaryCta = page.locator('.hero-actions .button-lime');
    await expect(primaryCta).toBeVisible();
  });

  test('should render services and case studies sections', async ({ page }) => {
    await page.goto('/');

    // Services section
    const serviceCards = page.locator('.service-card');
    await expect(serviceCards).toHaveCount(3);

    // Projects section
    const projectCards = page.locator('.project-card');
    const projectCount = await projectCards.count();
    expect(projectCount).toBeGreaterThanOrEqual(1);

    // Footer
    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();
  });
});

test.describe('Content Studio (Admin) E2E', () => {
  test('should render login view when unauthenticated', async ({ page }) => {
    await page.goto('/admin/');

    // Login header
    await expect(page.locator('.login-header h1')).toHaveText('Content Studio');

    // Input fields
    const usernameInput = page.locator('input[autocomplete="username"]');
    const passwordInput = page.locator('input[autocomplete="current-password"]');
    const submitButton = page.locator('button.login-button');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show error notification on invalid login attempt', async ({ page }) => {
    await page.goto('/admin/');

    await page.fill('input[autocomplete="username"]', 'admin');
    await page.fill('input[autocomplete="current-password"]', 'WrongPassword123!');
    await page.click('button.login-button');

    const noticeError = page.locator('.notice.error');
    await expect(noticeError).toBeVisible();
    await expect(noticeError).toContainText(/Invalid|failed/i);
  });
});
