import { test, expect } from '@playwright/test';

test.describe('Play Hand Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate: Title -> Ante Select -> Blind Select -> Playing
    await page.locator('#startBtn').click();
    await page.locator('button', { hasText: '选择盲注' }).click();
    await page.keyboard.press('1'); // Select Small Blind (target 100)
  });

  test('8 cards are dealt on entering playing state', async ({ page }) => {
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(8);
  });

  test('cards are selectable by clicking', async ({ page }) => {
    const cards = page.locator('.card');

    // Click first card
    await cards.first().click();
    await expect(cards.first()).toHaveClass(/selected/);

    // Click again to deselect
    await cards.first().click();
    await expect(cards.first()).not.toHaveClass(/selected/);
  });

  test('selecting multiple cards works correctly', async ({ page }) => {
    const cards = page.locator('.card');

    // Select 3 cards
    await cards.nth(0).click();
    await cards.nth(1).click();
    await cards.nth(2).click();

    await expect(cards.nth(0)).toHaveClass(/selected/);
    await expect(cards.nth(1)).toHaveClass(/selected/);
    await expect(cards.nth(2)).toHaveClass(/selected/);
    await expect(cards.nth(3)).not.toHaveClass(/selected/);

    // Selected count should be shown in button
    const playBtn = page.locator('#playBtn');
    await expect(playBtn).toContainText('3张');
  });

  test('play button is disabled when no cards selected', async ({ page }) => {
    const playBtn = page.locator('#playBtn');
    await expect(playBtn).toBeDisabled();
  });

  test('play button is enabled when at least one card selected', async ({ page }) => {
    await page.locator('.card').first().click();
    const playBtn = page.locator('#playBtn');
    await expect(playBtn).toBeEnabled();
  });

  test('spacebar plays hand when cards are selected', async ({ page }) => {
    // Select 5 cards
    const cards = page.locator('.card');
    for (let i = 0; i < 5; i++) {
      await cards.nth(i).click();
    }

    // Press spacebar
    await page.keyboard.press('Space');

    // Should transition to scoring state
    const scorePanel = page.locator('.score-panel');
    await expect(scorePanel).toBeVisible({ timeout: 3000 });

    // Should show hand type display
    const handTypeDisplay = page.locator('.hand-type-display');
    await expect(handTypeDisplay).toBeVisible();

    // Score should be shown
    const scoreFinal = page.locator('.score-final');
    await expect(scoreFinal).toBeVisible();
  });

  test('clicking play button scores the hand', async ({ page }) => {
    // Select 5 cards
    const cards = page.locator('.card');
    for (let i = 0; i < 5; i++) {
      await cards.nth(i).click();
    }

    // Click play button
    await page.locator('#playBtn').click();

    // Should show scoring screen
    const scorePanel = page.locator('.score-panel');
    await expect(scorePanel).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.hand-type-display')).toBeVisible();
  });

  test('status bar shows correct information during play', async ({ page }) => {
    // Ante: label is in .status-label, value is the .status-value below it
    const statusItems = page.locator('.status-item');
    await expect(statusItems).toHaveCount(5);

    // Target score
    const targetValue = page.locator('.status-value.target');
    await expect(targetValue).toContainText('100');

    // Current score starts at 0
    const currentValue = page.locator('#currentScore');
    await expect(currentValue).toContainText('0');

    // Hands remaining
    const handsValue = page.locator('.status-value.hands');
    await expect(handsValue).toContainText('4');

    // Money display (contains $)
    const moneyValue = page.locator('.status-value').filter({ hasText: '$' });
    await expect(moneyValue.first()).toBeVisible();
  });

  test('progress bar is visible and starts at 0%', async ({ page }) => {
    const progressContainer = page.locator('.progress-container');
    await expect(progressContainer).toBeVisible();

    // Progress fill starts at 0% width (may be hidden if width=0), check container instead
    const progressText = page.locator('.progress-text');
    await expect(progressText).toContainText('0');
    await expect(progressText).toContainText('/ 100');
  });

  test('scoring screen has continue button', async ({ page }) => {
    // Play a hand first
    const cards = page.locator('.card');
    for (let i = 0; i < 5; i++) {
      await cards.nth(i).click();
    }
    await page.keyboard.press('Space');

    // Continue button should be visible
    const continueBtn = page.locator('button', { hasText: '继续出牌' });
    await expect(continueBtn).toBeVisible({ timeout: 3000 });
  });

  test('joker slots area is rendered in playing state', async ({ page }) => {
    const jokerArea = page.locator('.joker-area');
    await expect(jokerArea).toBeVisible();
    await expect(jokerArea).toContainText('Joker');

    // Empty slots should be shown
    const emptySlots = page.locator('.joker-slot.empty');
    await expect(emptySlots).toHaveCount(5); // 5 empty slots on fresh game
  });

  test('selecting cards updates hand label', async ({ page }) => {
    const handLabel = page.locator('.hand-label');

    // Initially no cards selected
    await expect(handLabel).toContainText('已选 0 张');

    // Select 3 cards
    const cards = page.locator('.card');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await cards.nth(2).click();

    await expect(handLabel).toContainText('已选 3 张');
  });
});
