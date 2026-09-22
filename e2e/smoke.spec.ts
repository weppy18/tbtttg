import { expect, test, type Page } from '@playwright/test';

const cell = (page: Page, row: number, col: number) =>
  page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${col},`) });
const status = (page: Page) => page.getByTestId('status');

async function setMode(page: Page, mode: 'Two players' | 'Versus AI' | 'Watch AI vs AI') {
  await page.getByLabel(mode).check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    // Skip the first-run tour everywhere except the tour test itself.
    localStorage.setItem('tttg:settings', JSON.stringify({ seenTour: true }));
  });
  await page.reload();
});

test('first run shows a tour that can be stepped through and never returns', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const tour = page.getByTestId('tour');
  await expect(tour).toBeVisible();
  await expect(tour).toContainText('Step 1 of 3');
  await page.getByTestId('tour-next').click();
  await expect(tour).toContainText('Step 2 of 3');
  await page.getByTestId('tour-next').click();
  await page.getByTestId('tour-next').click();
  await expect(tour).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('tour')).toBeHidden();
});

test('how to play opens a dialog with every variant and closes with Escape', async ({ page }) => {
  await page.getByTestId('help').click();
  const dlg = page.getByTestId('how-to-play');
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('Ultimate');
  await expect(dlg).toContainText('LOSES');
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
});

test('two local players can play to a win and restart', async ({ page }) => {
  await setMode(page, 'Two players');
  await expect(status(page)).toHaveText('X to move');

  await cell(page, 1, 1).click();
  await cell(page, 2, 1).click();
  await cell(page, 1, 2).click();
  await cell(page, 2, 2).click();
  await cell(page, 1, 3).click();

  await expect(status(page)).toHaveText('X wins!');
  await expect(page.locator('.cell--win')).toHaveCount(3);
  await expect(page.locator('.board__line')).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(status(page)).toHaveText('X to move');
  await expect(page.locator('[data-mark="X"]')).toHaveCount(0);
});

test('draw is detected and recorded in the scoreboard', async ({ page }) => {
  await setMode(page, 'Two players');
  const order: [number, number][] = [
    [1, 1],
    [1, 2],
    [1, 3],
    [2, 2],
    [2, 1],
    [2, 3],
    [3, 2],
    [3, 1],
    [3, 3],
  ];
  for (const [r, c] of order) await cell(page, r, c).click();
  await expect(status(page)).toHaveText('Draw.');
  await expect(page.getByTestId('scoreboard')).toContainText('Draws');
  await expect(page.getByTestId('scoreboard').locator('.stat--draw dd')).toHaveText('1');
});

test('clicking a taken cell shakes the board and changes nothing', async ({ page }) => {
  await setMode(page, 'Two players');
  await cell(page, 2, 2).click();
  await cell(page, 2, 2).click({ force: true }); // aria-disabled, so force the click
  await expect(status(page)).toHaveText('O to move');
  await expect(page.getByTestId('board')).toHaveCSS('animation-name', /board-shake/);
});

test('versus AI: the AI replies and undo returns to the human turn', async ({ page }) => {
  await setMode(page, 'Versus AI');
  await page.getByLabel('Impossible').check();
  await expect(status(page)).toHaveText('Your turn (X)');
  await cell(page, 2, 2).click();
  await expect(page.locator('[data-mark="O"]')).toHaveCount(1, { timeout: 5000 });
  await expect(status(page)).toHaveText('Your turn (X)');

  await page.getByTestId('undo').click();
  await expect(page.locator('[data-mark]:not([data-mark=""])')).toHaveCount(0);
  await expect(status(page)).toHaveText('Your turn (X)');
  await page.getByTestId('redo').click();
  await expect(page.locator('[data-mark="O"]')).toHaveCount(1);
});

test('versus AI as O: the AI opens', async ({ page }) => {
  await setMode(page, 'Versus AI');
  await page.getByLabel('O (second)').check();
  await expect(page.locator('[data-mark="X"]')).toHaveCount(1, { timeout: 5000 });
  await expect(status(page)).toHaveText('Your turn (O)');
});

test('impossible AI cannot be beaten in a scripted attempt', async ({ page }) => {
  await setMode(page, 'Versus AI');
  await page.getByLabel('Impossible').check();
  // Play greedily: always the first empty cell. The AI must not lose.
  for (let i = 0; i < 5; i++) {
    const empty = page.locator('.cell--empty:not([aria-disabled="true"])').first();
    if ((await empty.count()) === 0) break;
    await empty.click();
    await page.waitForTimeout(700);
  }
  await expect(status(page)).not.toHaveText('You win!');
});

test('AI vs AI plays a whole game by itself', async ({ page }) => {
  await setMode(page, 'Watch AI vs AI');
  await expect(status(page)).toHaveText(/wins|Draw/, { timeout: 15000 });
});

test('keyboard: arrows + Enter and digit keys place marks', async ({ page }) => {
  await setMode(page, 'Two players');
  await cell(page, 1, 1).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(cell(page, 2, 2)).toHaveAttribute('data-mark', 'X');
  await page.keyboard.press('1');
  await expect(cell(page, 1, 1)).toHaveAttribute('data-mark', 'O');
  await page.keyboard.press('u');
  await expect(cell(page, 1, 1)).toHaveAttribute('data-mark', '');
});

test('screen reader announcements are made for moves', async ({ page }) => {
  await setMode(page, 'Two players');
  await cell(page, 1, 1).click();
  await expect(page.getByTestId('announcer')).toContainText('X played row 1, column 1.');
});

test('variants: 5x5 board renders 25 cells and misère flips the result', async ({ page }) => {
  await setMode(page, 'Two players');
  await page.getByLabel('5×5').check();
  await expect(page.locator('.cell')).toHaveCount(25);
  await page.getByLabel('Misère 3×3').check();
  await cell(page, 1, 1).click();
  await cell(page, 2, 1).click();
  await cell(page, 1, 2).click();
  await cell(page, 2, 2).click();
  await cell(page, 1, 3).click();
  await expect(status(page)).toHaveText('X completed a line — O wins!');
});

test('theme toggle cycles and persists; language switches to French', async ({ page }) => {
  const html = page.locator('html');
  await page.getByTestId('theme-toggle').click(); // system -> light
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('theme-toggle').click(); // light -> dark
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByTestId('language-select').selectOption('fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Morpion');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Morpion');
});

test('hint highlights a cell and analysis grades a blunder', async ({ page }) => {
  await setMode(page, 'Two players');
  await page.getByTestId('hint').click();
  await expect(page.locator('.cell--hint')).toHaveCount(1);
  // X 1,1 / O 2,2 / X 3,3 / O 1,3 (blunder) / X 3,1 / O 2,1 / X 3,2 → X wins
  const seq: [number, number][] = [
    [1, 1],
    [2, 2],
    [3, 3],
    [1, 3],
    [3, 1],
    [2, 1],
    [3, 2],
  ];
  for (const [r, c] of seq) await cell(page, r, c).click();
  await expect(status(page)).toHaveText('X wins!');
  await page.getByTestId('analyse').click();
  await expect(page.getByTestId('analysis')).toContainText('O: 1 blunder');
  await expect(page.getByTestId('analysis')).toContainText('X: perfect');
  await expect(page.getByTestId('history').locator('.cell--blunder')).toHaveCount(1);
  // jump to the blunder and see the best alternatives outlined
  await page.getByRole('button', { name: 'Move 4: O at row 1, column 3' }).click();
  await expect(page.locator('.board .cell--blunder')).toHaveCount(1);
  await expect(page.locator('.board .cell--best')).toHaveCount(4);
});

test('sound toggle persists', async ({ page }) => {
  const toggle = page.getByTestId('sound-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('a shared link loads the game, replays it, and share copies a link', async ({
  page,
  context,
}) => {
  await page.goto('/?g=classic.031425');
  await expect(status(page)).toHaveText('X wins!');
  await expect(page).not.toHaveURL(/g=/);
  await expect(page.locator('[data-mark="X"]')).toHaveCount(3);

  await page.getByTestId('replay').click();
  await expect(page.locator('[data-mark="X"]')).toHaveCount(0);
  await expect(page.locator('[data-mark="X"]')).toHaveCount(3, { timeout: 8000 });
  await expect(status(page)).toHaveText('X wins!');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId('share').click();
  await expect(page.getByTestId('share')).toHaveText('Link copied!');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('g=classic.03142');
});

test('ultimate: moves constrain the next board, AI replies, and a game can be watched', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await setMode(page, 'Two players');
  await page.getByLabel('Ultimate').check();
  await expect(page.locator('.cell')).toHaveCount(81);
  await page.locator('[data-index="40"]').click(); // centre of centre board
  await expect(page.getByTestId('ultimate-hint')).toHaveText('Must play in board 5');
  await expect(page.locator('[data-active]')).toHaveCount(1);
  // playing outside the active board is rejected
  await page.locator('[data-index="0"]').click({ force: true });
  await expect(page.locator('[data-mark="O"]')).toHaveCount(0);
  await page.locator('[data-index="36"]').click(); // board 5, cell 1 -> sends X to board 1
  await expect(page.getByTestId('ultimate-hint')).toHaveText('Must play in board 1');

  await setMode(page, 'Watch AI vs AI');
  await page.getByLabel('Easy', { exact: true }).nth(0).check();
  await page.getByLabel('Easy', { exact: true }).nth(1).check();
  await expect(status(page)).toHaveText(/wins|Draw/, { timeout: 90000 });
});

test('player profiles: names show in status, custom marks render, and persist', async ({
  page,
}) => {
  await setMode(page, 'Two players');
  await page.getByTestId('players').locator('summary').click();
  await page.getByTestId('name-X').fill('Alice');
  await page.getByTestId('name-O').fill('Bob');
  await expect(status(page)).toHaveText('Alice to move');
  await page.getByTestId('players').getByRole('button', { name: '🐱' }).first().click();
  await cell(page, 1, 1).click();
  await expect(cell(page, 1, 1).locator('.mark--glyph')).toHaveText('🐱');
  await expect(status(page)).toHaveText('Bob to move');
  await page.reload();
  await page.getByTestId('players').locator('summary').click();
  await expect(page.getByTestId('name-X')).toHaveValue('Alice');
  await expect(
    page.getByTestId('players').getByRole('button', { name: '🐱' }).first(),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('offline badge appears when the connection drops', async ({ page, context }) => {
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('offline')).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByTestId('offline')).toBeHidden();
});

test('service worker registers and the app loads from cache offline', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'chromium', 'service workers are checked once');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // the first controlled load
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tic-Tac-Toe');
  await expect(page.locator('.cell')).toHaveCount(9);
  await context.setOffline(false);
});

test('daily puzzle: wrong tries reveal a hint, the solution solves it, and progress persists', async ({
  page,
}) => {
  await page.getByTestId('nav-daily').click();
  await expect(page.getByTestId('puzzle')).toBeVisible();
  await expect(page.getByTestId('puzzle-status')).toContainText('to play and win');
  // Try every empty cell in order until the puzzle reports success; the hint appears after two misses.
  const empties = await page
    .locator('.cell--empty')
    .evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.index)));
  let wrong = 0;
  for (const i of empties) {
    await page.locator(`[data-index="${i}"]`).click({ force: true });
    const text = await page.getByTestId('puzzle-status').innerText();
    if (text.includes('Correct')) break;
    wrong++;
    if (wrong === 2) await expect(page.locator('.cell--hint')).toHaveCount(1);
  }
  await expect(page.getByTestId('puzzle-status')).toContainText('Correct');
  await expect(page.getByTestId('puzzle').locator('.stat dd').first()).toHaveText('1');
  await page.reload();
  await page.getByTestId('nav-daily').click();
  await expect(page.getByTestId('puzzle-status')).toContainText('already solved');
  await page.getByTestId('practice').click();
  await expect(page.getByTestId('puzzle-status')).toContainText('to play and win');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('board')).toBeVisible();
});

test('tournament: best-of-3 alternates sides, keeps score, and declares a series winner', async ({
  page,
}) => {
  await setMode(page, 'Two players');
  await page.getByTestId('players').locator('summary').click();
  await page.getByTestId('name-X').fill('Alice');
  await page.getByTestId('name-O').fill('Bob');
  await page.getByTestId('series-3').click();
  await expect(page.getByTestId('series')).toContainText('Best of 3 · Game 1');
  await expect(page.getByTestId('series-score')).toContainText('Alice');
  await expect(page.getByTestId('series-score')).toContainText('0 – 0');

  // Game 1: X (Alice) wins the top row.
  for (const [r, c] of [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3],
  ] as const)
    await cell(page, r, c).click();
  await expect(status(page)).toHaveText('Alice wins!');
  await expect(page.getByTestId('series-score')).toContainText('1 – 0');
  await page.getByTestId('new-game').click(); // "Next game"

  // Game 2: sides swap — X is now Bob.
  await expect(page.getByTestId('series')).toContainText('Game 2');
  await expect(status(page)).toHaveText('Bob to move');
  for (const [r, c] of [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3],
  ] as const)
    await cell(page, r, c).click();
  await expect(status(page)).toHaveText('Bob wins!');
  await expect(page.getByTestId('series-score')).toContainText('1 – 1');
  await page.getByTestId('new-game').click();

  // Game 3: Alice is X again and takes the series.
  await expect(status(page)).toHaveText('Alice to move');
  for (const [r, c] of [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3],
  ] as const)
    await cell(page, r, c).click();
  await expect(status(page)).toHaveText('Alice wins the series 2–1!');
  await expect(page.getByTestId('new-game')).toHaveText('New series');
});

test('hot seat: the board hides between turns until the next player is ready', async ({ page }) => {
  await setMode(page, 'Two players');
  await page.getByTestId('hot-seat').check();
  await cell(page, 1, 1).click();
  await expect(page.getByTestId('shield')).toBeVisible();
  await expect(page.getByTestId('shield')).toContainText('Pass the device to O');
  await page.getByTestId('shield-continue').click();
  await expect(page.getByTestId('shield')).toBeHidden();
  await cell(page, 2, 2).click();
  await expect(page.getByTestId('shield')).toContainText('Pass the device to X');
  await page.keyboard.press('Enter'); // the continue button is focused
  await expect(page.getByTestId('shield')).toBeHidden();
  await page.getByTestId('hot-seat').uncheck();
  await cell(page, 1, 2).click();
  await expect(page.getByTestId('shield')).toBeHidden();
});

test('opening explorer labels every reply and the best line ends in a draw', async ({ page }) => {
  await page.getByTestId('nav-explore').click();
  await expect(page.getByTestId('explorer')).toBeVisible();
  await expect(page.getByTestId('explorer-status')).toHaveText('X to move — Draw with best play');
  await expect(page.getByTestId('explorer-counts')).toHaveText(
    '0 winning, 9 drawing, 0 losing moves',
  );
  await expect(page.getByTestId('board').locator('.cell--eval-draw')).toHaveCount(9);
  // X corner, O centre, X opposite corner: now O has 4 drawing edges and 4 losing corners... (2 empty corners)
  await cell(page, 1, 1).click();
  await cell(page, 2, 2).click();
  await cell(page, 3, 3).click();
  await expect(page.getByTestId('explorer-counts')).toHaveText(
    '0 winning, 4 drawing, 2 losing moves',
  );
  await expect(page.getByTestId('board').locator('.cell--eval-loss')).toHaveCount(2);
  await page.getByTestId('crumbs').getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('board').locator('.cell--eval-draw')).toHaveCount(9);
  await page.getByTestId('best-line').click();
  await expect(page.getByTestId('explorer-status')).toHaveText('Draw.');
  await page.getByRole('radio', { name: 'Misère 3×3' }).check();
  await expect(page.getByTestId('explorer-counts')).toContainText('drawing');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('board')).toBeVisible();
});
