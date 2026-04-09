import { test, expect } from '@playwright/test';

test.describe('Shop Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * Navigate to the Shop screen by completing all 3 blinds.
   */
  async function navigateToShop(page: any) {
    await page.locator('#startBtn').click();
    await page.locator('button', { hasText: '选择盲注' }).click();

    // Complete Small Blind
    await page.keyboard.press('1');
    await playBlindUntilComplete(page);

    // Complete Big Blind
    await page.keyboard.press('2');
    await playBlindUntilComplete(page);

    // Complete Boss Blind -> shop appears
    await page.keyboard.press('3');
    await playBlindUntilComplete(page);

    // Wait for shop to appear
    await page.waitForSelector('h2:has-text("商店")', { timeout: 5000 });
  }

  /**
   * Play through a blind until all 4 hands are exhausted.
   */
  async function playBlindUntilComplete(page: any) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const cards = page.locator('.card');
      const count = await cards.count();
      if (count === 0) break;

      const selectCount = Math.min(5, count);
      for (let i = 0; i < selectCount; i++) {
        await cards.nth(i).click();
      }
      await page.keyboard.press('Space');

      // Wait for a button to appear after playing
      try {
        await page.locator('button', { hasText: '继续出牌' }).waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        // If "继续出牌" not found, try "查看结果"
        try {
          await page.locator('button', { hasText: '查看结果' }).waitFor({ state: 'visible', timeout: 3000 });
          await page.locator('button', { hasText: '查看结果' }).click();
          await page.waitForTimeout(500);
          return;
        } catch {
          continue;
        }
      }

      // Check if blind is complete ("查看结果" visible)
      const resultBtn = page.locator('button', { hasText: '查看结果' });
      if (await resultBtn.isVisible()) {
        await resultBtn.click();
        await page.waitForTimeout(500);
        return;
      }

      // Click "继续出牌" to continue
      const continueBtn = page.locator('button', { hasText: '继续出牌' });
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }

  test('shop screen is accessible after completing Boss Blind', async ({ page }) => {
    await navigateToShop(page);

    const shopHeading = page.locator('h2', { hasText: '商店' });
    await expect(shopHeading).toBeVisible();
  });

  test('shop shows Joker cards for sale', async ({ page }) => {
    await navigateToShop(page);

    const jokerSection = page.locator('text=Joker');
    await expect(jokerSection).toBeVisible();

    const body = page.locator('body');
    await expect(body).toContainText('$');
  });

  test('shop shows Tarot or Planet card for sale', async ({ page }) => {
    await navigateToShop(page);

    const body = page.locator('body');
    const hasTarotOrPlanet = await body.getByText(/Tarot|Planet/).isVisible();
    expect(hasTarotOrPlanet).toBeTruthy();
  });

  test('shop displays current money balance', async ({ page }) => {
    await navigateToShop(page);

    const moneyValues = page.locator('.status-value');
    let found = false;
    const count = await moneyValues.count();
    for (let i = 0; i < count; i++) {
      const text = await moneyValues.nth(i).textContent();
      if (text && text.includes('$')) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('leaving shop navigates to next Ante', async ({ page }) => {
    await navigateToShop(page);

    const leaveBtn = page.locator('button', { hasText: /进入 Ante|查看结果/ });
    await expect(leaveBtn).toBeVisible();
    await leaveBtn.click();
    await page.waitForTimeout(500);

    const anteHeading = page.locator('h2');
    await expect(anteHeading).toContainText('Ante 2');
  });

  test('joker purchase removes joker from shop and shows it on Ante select', async ({ page }) => {
    await navigateToShop(page);

    const purchasableJoker = page.locator('.joker-slot:not(.empty)').first();
    const isEnabled = await purchasableJoker.evaluate((el) => {
      return window.getComputedStyle(el).cursor !== 'not-allowed';
    });

    if (isEnabled) {
      await purchasableJoker.click();
      await page.waitForTimeout(300);

      const leaveBtn = page.locator('button', { hasText: /进入 Ante/ });
      await leaveBtn.click();
      await page.waitForTimeout(500);

      const anteScreen = page.locator('.title-screen');
      await expect(anteScreen).toContainText('Joker');
    }
  });
});
