import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.1 AA audit with axe-core on every major screen state, light and dark. */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
  expect(summary, label).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  // Colour transitions would otherwise be sampled mid-way by axe.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tttg:settings', JSON.stringify({ seenTour: true }));
  });
  await page.reload();
});

for (const theme of ['light', 'dark'] as const) {
  test(`no axe violations in ${theme} theme across screens`, async ({ page }) => {
    await page.evaluate((t) => {
      localStorage.setItem('tttg:settings', JSON.stringify({ seenTour: true, theme: t }));
    }, theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    await audit(page, `${theme}: initial (vs AI)`);

    await page.getByLabel('Two players').check();
    await page.locator('[data-index="4"]').click();
    await page.locator('[data-index="0"]').click();
    await audit(page, `${theme}: mid-game with history`);

    for (const i of [3, 6, 5]) await page.locator(`[data-index="${i}"]`).click();
    await page.getByTestId('analyse').click();
    await expect(page.getByTestId('analysis')).toBeVisible();
    await audit(page, `${theme}: game over + analysis`);

    await page.getByRole('radio', { name: 'Ultimate', exact: true }).check();
    await page.locator('[data-index="40"]').click();
    await audit(page, `${theme}: ultimate`);

    await page.getByTestId('players').locator('summary').click();
    await audit(page, `${theme}: players panel open`);

    await page.getByTestId('help').click();
    await expect(page.getByTestId('how-to-play')).toBeVisible();
    await audit(page, `${theme}: how-to-play dialog`);
  });
}

test('first-run tour dialog has no axe violations', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('tour')).toBeVisible();
  await audit(page, 'tour');
});
