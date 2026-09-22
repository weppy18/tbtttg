import { expect, test } from '@playwright/test';

const cell = (page: import('@playwright/test').Page, n: number) =>
  page.getByRole('button', { name: new RegExp(`^Cell ${n},`) });

test('two local players can play to a win and restart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /tic-tac-toe/i })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('X to move');

  for (const n of [1, 4, 2, 5, 3]) await cell(page, n).click();

  await expect(page.getByRole('status')).toContainText('X wins');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('status')).toContainText('X to move');
});

test('draw is detected', async ({ page }) => {
  await page.goto('/');
  for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) await cell(page, n).click();
  await expect(page.getByRole('status')).toContainText('draw');
});
