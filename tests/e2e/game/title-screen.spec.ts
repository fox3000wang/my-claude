import { test, expect } from '@playwright/test';

test.describe('Title Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the title screen with game title and start button', async ({ page }) => {
    // Check that the main title is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('小丑牌');

    // Check subtitle text
    const subtitle = page.locator('.title-screen p');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('打出扑克牌');

    // Check mini-cards animation elements are present
    const miniCards = page.locator('.mini-card');
    await expect(miniCards).toHaveCount(5);

    // Check start button is visible and enabled
    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
    await expect(startBtn).toContainText('开始游戏');
  });

  test('clicking Start Game navigates to ANTE_SELECT screen', async ({ page }) => {
    const startBtn = page.locator('#startBtn');
    await startBtn.click();

    // Should show Ante select screen with "Ante X / 3"
    const anteHeading = page.locator('h2');
    await expect(anteHeading).toBeVisible();
    await expect(anteHeading).toContainText('Ante');

    // Confirm button should be present
    const confirmBtn = page.locator('button', { hasText: '选择盲注' });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
  });

  test('title screen has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
