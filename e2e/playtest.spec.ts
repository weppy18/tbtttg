import { expect, test, type Page } from '@playwright/test';

/**
 * Automated play-testing: random legal games across every mode and variant,
 * with invariants checked after each. Any page error fails the run.
 */
const VARIANTS = ['Classic 3×3', 'Misère 3×3', '4×4', '5×5', 'Ultimate'] as const;
const status = (page: Page) => page.getByTestId('status');
const RESULT = /wins|Draw|win!|AI wins/;

async function playRandomGame(page: Page, budgetMs = 100_000) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (RESULT.test(await status(page).innerText())) return;
    const playable = page.locator('.cell--empty:not([aria-disabled="true"])');
    const n = await playable.count();
    if (n === 0) {
      // AI to move or game over: wait for either.
      await page.waitForTimeout(150);
      continue;
    }
    await playable.nth(Math.floor(Math.random() * n)).click();
  }
}

test.describe('play-test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('tttg:settings', JSON.stringify({ seenTour: true, sound: false }));
    });
    await page.reload();
  });

  for (const variant of VARIANTS) {
    test(`two players, ${variant}: two random games with undo and replay`, async ({ page }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.getByLabel('Two players').check();
      await page.getByRole('radio', { name: variant, exact: true }).check();
      for (let g = 0; g < 2; g++) {
        await playRandomGame(page);
        await expect(status(page)).toHaveText(RESULT);
        // history length == marks on the board
        const marks = await page.locator('[data-mark="X"], [data-mark="O"]').count();
        const items = await page.getByTestId('history').locator('.history__item').count();
        expect(items - 1).toBe(marks);
        // undo re-opens the game; redo restores the result
        await page.getByTestId('undo').click();
        await expect(status(page)).not.toHaveText(RESULT);
        await page.getByTestId('redo').click();
        await expect(status(page)).toHaveText(RESULT);
        // analysis grades every move
        await page.getByTestId('analyse').click();
        await expect(page.getByTestId('analysis')).toBeVisible({ timeout: 30_000 });
        await page.getByTestId('new-game').click();
        await expect(page.locator('[data-mark="X"]')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    });

    test(`versus AI (Hard), ${variant}: a random human never crashes the AI`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.getByLabel('Versus AI').check();
      await page.getByRole('radio', { name: variant, exact: true }).check();
      await page.getByLabel('Hard').check();
      await page.getByLabel(Math.random() < 0.5 ? 'X (first)' : 'O (second)').check();
      await playRandomGame(page);
      await expect(status(page)).toHaveText(RESULT, { timeout: 60_000 });
      await expect(page.getByTestId('scoreboard')).toContainText('Games');
      expect(errors).toEqual([]);
    });
  }

  test('AI vs AI, every level pairing on 3×3, finishes and records stats', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByLabel('Watch AI vs AI').check();
    const levels = ['Easy', 'Medium', 'Hard', 'Impossible'];
    for (let i = 0; i < 4; i++) {
      await page.getByLabel(levels[i]!, { exact: true }).nth(0).check();
      await page
        .getByLabel(levels[3 - i]!, { exact: true })
        .nth(1)
        .check();
      await expect(status(page)).toHaveText(RESULT, { timeout: 30_000 });
    }
    await expect(page.getByTestId('scoreboard').locator('.stat').last()).toContainText('1');
    expect(errors).toEqual([]);
  });

  test('Impossible vs Impossible on 3×3 is always a draw', async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByLabel('Watch AI vs AI').check();
    await page.getByLabel('Impossible', { exact: true }).nth(0).check();
    await page.getByLabel('Impossible', { exact: true }).nth(1).check();
    for (let i = 0; i < 3; i++) {
      await expect(status(page)).toHaveText('Draw.', { timeout: 20_000 });
      await page.getByTestId('new-game').click();
    }
  });
});
