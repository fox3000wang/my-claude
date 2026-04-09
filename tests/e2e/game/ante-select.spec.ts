import { test, expect } from '@playwright/test';

test.describe('Ante Select Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to Ante Select by clicking Start Game
    await page.locator('#startBtn').click();
  });

  test('Ante select screen shows correct Ante number', async ({ page }) => {
    // Should show Ante 1 / 3
    const anteHeading = page.locator('h2');
    await expect(anteHeading).toBeVisible();
    await expect(anteHeading).toContainText('Ante 1');
    await expect(anteHeading).toContainText('3');
  });

  test('Ante select shows Joker slots and money info', async ({ page }) => {
    // Money info should be visible (starts at $4)
    const moneyInfo = page.locator('.title-screen p');
    await expect(moneyInfo).toBeVisible();
    await expect(moneyInfo).toContainText('筹码');

    // Joker slots area (shows "暂无 Joker" when empty)
    const jokerArea = page.locator('.title-screen');
    await expect(jokerArea).toContainText('暂无 Joker');
  });

  test('clicking Select Blind button navigates to BLIND_SELECT', async ({ page }) => {
    const confirmBtn = page.locator('button', { hasText: '选择盲注' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Should show Blind selection screen
    const blindHeading = page.locator('h2');
    await expect(blindHeading).toBeVisible();
    await expect(blindHeading).toContainText('选择盲注');
  });

  test('no Joker cards are shown on fresh start', async ({ page }) => {
    // No Joker slots with content
    const emptyJokerSlots = page.locator('.joker-slot:not(.empty)');
    await expect(emptyJokerSlots).toHaveCount(0);

    // Should show "暂无 Joker" message
    await expect(page.locator('.title-screen')).toContainText('暂无 Joker');
  });
});
