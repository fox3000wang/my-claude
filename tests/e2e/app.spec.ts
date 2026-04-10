import { test, expect } from '@playwright/test';

test.describe('StarCraft Web App', () => {

  test('app loads and renders toolbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Toolbar buttons
    const recBtn = page.locator('button:has-text("Rec")');
    await expect(recBtn).toBeVisible();

    const playBtn = page.locator('button:has-text("Play")');
    await expect(playBtn).toBeVisible();

    const netBtn = page.locator('button:has-text("Net")');
    await expect(netBtn).toBeVisible();
  });

  test('HUD renders with resource display', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Resource panel visible
    const resourcePanel = page.locator('text=Mineral:');
    await expect(resourcePanel).toBeVisible();

    // Supply display
    const supplyPanel = page.locator('text=Supply:');
    await expect(supplyPanel).toBeVisible();
  });

  test('rec and play buttons are disabled without game', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const recBtn = page.locator('button:has-text("Rec")');
    await expect(recBtn).toBeDisabled();

    const playBtn = page.locator('button:has-text("Play")');
    await expect(playBtn).toBeDisabled();
  });

  test('multiplayer panel toggles open and closed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Net button to open multiplayer panel
    await page.locator('button:has-text("Net")').click();

    // Multiplayer panel should appear
    const panel = page.locator('text=NETWORK GAME');
    await expect(panel).toBeVisible();

    // Connection status should show
    await expect(page.locator('text=idle')).toBeVisible();

    // Close it
    await page.locator('button:has-text("Net ✕")').click();
    await expect(panel).not.toBeVisible();
  });

  test('multiplayer panel has all form fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open multiplayer panel
    await page.locator('button:has-text("Net")').click();

    // Server input with localhost
    const serverInput = page.locator('input[value*="localhost"]');
    await expect(serverInput).toBeVisible();

    // Player name input
    const nameInput = page.locator('input[maxlength="16"]');
    await expect(nameInput).toBeVisible();

    // Connect button
    const connectButton = page.locator('button:has-text("Connect")');
    await expect(connectButton).toBeVisible();

    // Spectator checkbox label
    await expect(page.locator('text=Join as Spectator')).toBeVisible();
  });

  test('no critical console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      // Filter out expected WebGL/Three.js errors from GameCanvas (caught by ErrorBoundary)
      const msg = err.message;
      if (!msg.includes('removeChild') && !msg.includes('GameCanvas')) {
        errors.push(msg);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Only check for truly critical errors (not WebGL errors caught by ErrorBoundary)
    const criticalErrors = errors.filter(e =>
      !e.includes('WebSocket') &&
      !e.includes('ws://') &&
      !e.includes('connection refused')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
