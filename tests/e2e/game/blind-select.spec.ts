import { test, expect } from '@playwright/test';

test.describe('Blind Select Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate: Title -> Ante Select -> Blind Select
    // Use force:true because the button may still be animating
    await page.locator('#startBtn').click({ force: true });
    await page.locator('button', { hasText: '选择盲注' }).click({ force: true });
  });

  test('blind select screen shows all 3 blind options', async ({ page }) => {
    const buttons = page.locator('.title-screen .btn-secondary');
    await expect(buttons).toHaveCount(3);
  });

  test('Small Blind option is shown with correct info', async ({ page }) => {
    const buttons = page.locator('.title-screen .btn-secondary');
    const firstButton = buttons.first();
    await expect(firstButton).toBeVisible();
    await expect(firstButton).toContainText('Small Blind');
    await expect(firstButton).toContainText('目标: 100');
    await expect(firstButton).toContainText('奖励: $3');
    // Should hint at keyboard shortcut 1
    await expect(firstButton).toContainText('按 1 快捷选择');
  });

  test('Big Blind option is shown with correct info', async ({ page }) => {
    const buttons = page.locator('.title-screen .btn-secondary');
    const secondButton = buttons.nth(1);
    await expect(secondButton).toContainText('Big Blind');
    await expect(secondButton).toContainText('目标: 200');
    await expect(secondButton).toContainText('奖励: $4');
    await expect(secondButton).toContainText('按 2 快捷选择');
  });

  test('Boss Blind option is shown with correct info', async ({ page }) => {
    const buttons = page.locator('.title-screen .btn-secondary');
    const thirdButton = buttons.nth(2);
    await expect(thirdButton).toContainText('Boss Blind');
    await expect(thirdButton).toContainText('目标: 100');
    await expect(thirdButton).toContainText('奖励: $5');
    await expect(thirdButton).toContainText('跳过 -$2');
    await expect(thirdButton).toContainText('按 3 快捷选择');
  });

  test('keyboard 1 selects Small Blind and starts playing', async ({ page }) => {
    await page.keyboard.press('1');

    // Should transition to PLAYING state
    // Cards should be visible in the hand area
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible({ timeout: 3000 });

    // Should have 8 cards in hand
    await expect(cards).toHaveCount(8);

    // Status bar should show target score 100
    const targetScore = page.locator('.status-value.target');
    await expect(targetScore).toContainText('100');

    // Should show hands remaining as 4
    const handsRemaining = page.locator('.status-value.hands');
    await expect(handsRemaining).toContainText('4');
  });

  test('keyboard 2 selects Big Blind', async ({ page }) => {
    await page.keyboard.press('2');

    const targetScore = page.locator('.status-value.target');
    await expect(targetScore).toContainText('200');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 3000 });
  });

  test('keyboard 3 selects Boss Blind', async ({ page }) => {
    await page.keyboard.press('3');

    const targetScore = page.locator('.status-value.target');
    await expect(targetScore).toContainText('100');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 3000 });
  });

  test('clicking Small Blind button selects it', async ({ page }) => {
    const buttons = page.locator('.title-screen .btn-secondary');
    await buttons.first().click();

    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible({ timeout: 3000 });
    await expect(cards).toHaveCount(8);
  });

  test('back button returns to Ante Select', async ({ page }) => {
    const backBtn = page.locator('button', { hasText: '返回' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Should be back at Ante Select
    const anteHeading = page.locator('h2');
    await expect(anteHeading).toContainText('Ante 1');
    await expect(anteHeading).toContainText('3');
  });
});
