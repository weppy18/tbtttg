import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  canRedo,
  canUndo,
  currentGame,
  difficultyFor,
  initialMatch,
  isAiSide,
  isSwapped,
  matchDifficulty,
  matchReducer,
  parseConfig,
  redoTarget,
  seatOf,
  seriesWinner,
  undoTarget,
  winsNeeded,
  type MatchConfig,
  type MatchState,
} from './match.ts';

const HVH: MatchConfig = { ...DEFAULT_CONFIG, mode: 'hvh' };
const HVA_X: MatchConfig = { ...DEFAULT_CONFIG, mode: 'hva', humanSide: 'X' };
const HVA_O: MatchConfig = { ...DEFAULT_CONFIG, mode: 'hva', humanSide: 'O' };
const AVA: MatchConfig = {
  ...DEFAULT_CONFIG,
  mode: 'ava',
  difficulty: 'easy',
  difficultyO: 'hard',
};

function play(match: MatchState, ...moves: number[]): MatchState {
  return moves.reduce((m, index) => matchReducer(m, { type: 'play', index }), match);
}

describe('matchReducer', () => {
  it('plays moves and derives the game', () => {
    const m = play(initialMatch(HVH), 4, 0);
    expect(m.cursor).toBe(2);
    const g = currentGame(m);
    expect(g.kind === 'board' && g.board[4]).toBe('X');
    expect(g.kind === 'board' && g.board[0]).toBe('O');
    expect(g.toMove).toBe('X');
  });

  it('flags invalid moves without changing the board', () => {
    const m0 = play(initialMatch(HVH), 4);
    const m1 = matchReducer(m0, { type: 'play', index: 4 });
    expect(m1.cursor).toBe(1);
    expect(m1.invalid).toEqual({ index: 4, nonce: 1 });
    expect(matchReducer(m1, { type: 'play', index: 1.5 }).invalid?.index).toBe(1.5);
    const m2 = matchReducer(m1, { type: 'play', index: 99 });
    expect(m2.invalid).toEqual({ index: 99, nonce: 2 });
    const won = play(initialMatch(HVH), 0, 3, 1, 4, 2);
    expect(matchReducer(won, { type: 'play', index: 5 }).invalid?.index).toBe(5);
    // a valid move clears the flag
    expect(play(m2, 0).invalid).toBeNull();
  });

  it('undo/redo step one ply in two-player mode', () => {
    const m = play(initialMatch(HVH), 4, 0, 8);
    expect(canUndo(m)).toBe(true);
    expect(canRedo(m)).toBe(false);
    const u = matchReducer(m, { type: 'undo' });
    expect(u.cursor).toBe(2);
    expect(canRedo(u)).toBe(true);
    const r = matchReducer(u, { type: 'redo' });
    expect(r.cursor).toBe(3);
    expect(matchReducer(r, { type: 'redo' })).toBe(r);
    const empty = initialMatch(HVH);
    expect(matchReducer(empty, { type: 'undo' })).toBe(empty);
  });

  it('undo versus AI returns to the human decision; redo restores the AI reply', () => {
    // human X: X4 O0 X8 O2 — human to move
    const m = play(initialMatch(HVA_X), 4, 0, 8, 2);
    expect(undoTarget(m)).toBe(2);
    const u = matchReducer(m, { type: 'undo' });
    expect(u.cursor).toBe(2);
    expect(currentGame(u).toMove).toBe('X');
    expect(redoTarget(u)).toBe(4);
    expect(matchReducer(u, { type: 'redo' }).cursor).toBe(4);

    // redo lands on the next human turn, not the end of the list
    const long = matchReducer(play(initialMatch(HVA_X), 4, 0, 8, 2, 6, 1), {
      type: 'jump',
      cursor: 2,
    });
    expect(redoTarget(long)).toBe(4);

    // AI hasn't replied yet: undo only the human ply
    const pending = play(initialMatch(HVA_X), 4);
    expect(undoTarget(pending)).toBe(0);
    // game over after the AI's winning move: back to the human's last decision
    const lost = play(initialMatch(HVA_O), 0, 4, 1, 8, 2);
    expect(currentGame(lost).winner).toBe('X');
    expect(undoTarget(lost)).toBe(3);

    // human O, only the AI's opening applied: undo goes to the start
    const opening = play(initialMatch(HVA_O), 4);
    expect(undoTarget(opening)).toBe(0);
    const back = matchReducer(opening, { type: 'undo' });
    expect(redoTarget(back)).toBe(1);
  });

  it('a new move after undo discards the redo tail', () => {
    const m = play(initialMatch(HVH), 4, 0, 8);
    const u = matchReducer(m, { type: 'undo' });
    const n = play(u, 6);
    expect(n.moves).toEqual([4, 0, 6]);
    expect(canRedo(n)).toBe(false);
  });

  it('jump clamps to the move list', () => {
    const m = play(initialMatch(HVH), 4, 0, 8);
    expect(matchReducer(m, { type: 'jump', cursor: 1 }).cursor).toBe(1);
    expect(matchReducer(m, { type: 'jump', cursor: -5 }).cursor).toBe(0);
    expect(matchReducer(m, { type: 'jump', cursor: 50 }).cursor).toBe(3);
    expect(matchReducer(m, { type: 'jump', cursor: 1.7 }).cursor).toBe(1);
  });

  it('newGame resets moves, bumps gameId and merges config', () => {
    const m = play(initialMatch(HVH), 4, 0);
    const n = matchReducer(m, { type: 'newGame', config: { variant: 'five', mode: 'ava' } });
    expect(n.moves).toEqual([]);
    expect(n.gameId).toBe(1);
    expect(n.config.variant).toBe('five');
    expect(n.config.mode).toBe('ava');
    const big = currentGame(n);
    expect(big.kind === 'board' ? big.board.length : 0).toBe(25);
    expect(matchReducer(n, { type: 'newGame' }).gameId).toBe(2);
  });

  it('load keeps only the legal prefix and clamps the cursor', () => {
    const m = matchReducer(initialMatch(), {
      type: 'load',
      config: HVH,
      moves: [0, 1, 2, 2, 5],
    });
    expect(m.moves).toEqual([0, 1, 2]);
    expect(m.cursor).toBe(3);
    const c = matchReducer(initialMatch(), { type: 'load', config: HVH, moves: [0, 1], cursor: 9 });
    expect(c.cursor).toBe(2);
    const z = matchReducer(initialMatch(), {
      type: 'load',
      config: HVH,
      moves: [0, 1],
      cursor: -1,
    });
    expect(z.cursor).toBe(0);
  });
});

describe('config helpers', () => {
  it('isAiSide / difficultyFor', () => {
    expect(isAiSide(HVH, 'X')).toBe(false);
    expect(isAiSide(HVA_X, 'O')).toBe(true);
    expect(isAiSide(HVA_X, 'X')).toBe(false);
    expect(isAiSide(AVA, 'X')).toBe(true);
    expect(difficultyFor(AVA, 'X')).toBe('easy');
    expect(difficultyFor(AVA, 'O')).toBe('hard');
    expect(difficultyFor(HVA_X, 'O')).toBe('medium');
  });

  it('parseConfig validates persisted data', () => {
    expect(parseConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, mode: 'nope' })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, variant: 'nope' })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, humanSide: 'Z' })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, difficulty: 'ultra' })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, difficultyO: 'ultra' })).toBeNull();
  });
});

describe('series (best-of-N)', () => {
  const X_WIN = [0, 3, 1, 4, 2];
  const O_WIN = [1, 0, 2, 3, 4, 6];
  const DRAW = [0, 1, 2, 4, 3, 5, 7, 6, 8];

  it('counts wins by seat, swaps seats every game, and ends at a majority', () => {
    let m = matchReducer(initialMatch(HVH), { type: 'startSeries', bestOf: 3 });
    expect(m.series).toEqual({
      bestOf: 3,
      game: 0,
      wins: { A: 0, B: 0 },
      draws: 0,
      recorded: false,
    });
    expect(isSwapped(m)).toBe(false);
    expect(seatOf(m, 'X')).toBe('A');
    m = play(m, ...X_WIN); // A (as X) wins game 1
    expect(m.series?.wins).toEqual({ A: 1, B: 0 });
    expect(m.series?.recorded).toBe(true);
    m = matchReducer(m, { type: 'newGame' });
    expect(m.series?.game).toBe(1);
    expect(isSwapped(m)).toBe(true);
    expect(seatOf(m, 'X')).toBe('B');
    expect(m.moves).toEqual([]);
    m = play(m, ...DRAW);
    expect(m.series?.draws).toBe(1);
    m = matchReducer(m, { type: 'newGame' });
    expect(m.series?.game).toBe(2);
    m = play(m, ...X_WIN); // game 3: X is seat A again -> A has 2 = majority
    expect(m.series?.wins).toEqual({ A: 2, B: 0 });
    expect(seriesWinner(m.series!)).toBe('A');
    // "new game" inside a finished series keeps the final board
    const after = matchReducer(m, { type: 'newGame' });
    expect(after.moves).toEqual(X_WIN);
    expect(after.series?.game).toBe(2);
    // changing the setup ends the series
    expect(matchReducer(m, { type: 'newGame', config: { variant: 'four' } }).series).toBeNull();
    expect(matchReducer(m, { type: 'endSeries' }).series).toBeNull();
    const casual = initialMatch(HVH);
    expect(matchReducer(casual, { type: 'endSeries' })).toBe(casual);
  });

  it('versus the AI the human changes sides each game and seat B can win', () => {
    let m = matchReducer(initialMatch(HVA_X), { type: 'startSeries', bestOf: 5 });
    expect(winsNeeded(5)).toBe(3);
    m = play(m, ...O_WIN); // AI (O, seat B) wins
    expect(m.series?.wins).toEqual({ A: 0, B: 1 });
    expect(seriesWinner(m.series!)).toBeNull();
    expect(seriesWinner({ ...m.series!, wins: { A: 0, B: 3 } })).toBe('B');
    m = matchReducer(m, { type: 'newGame' });
    expect(m.config.humanSide).toBe('O');
    expect(seatOf(m, 'O')).toBe('A'); // the human keeps seat A
    expect(matchDifficulty(m, 'X')).toBe('medium');
  });

  it('swaps AI difficulties in watch mode', () => {
    let m = matchReducer(initialMatch(AVA), { type: 'startSeries', bestOf: 99 });
    expect(m.series?.bestOf).toBe(3); // unknown lengths fall back
    expect(matchDifficulty(m, 'X')).toBe('easy');
    m = matchReducer(play(m, ...X_WIN), { type: 'newGame' });
    expect(matchDifficulty(m, 'X')).toBe('hard');
    expect(matchDifficulty(m, 'O')).toBe('easy');
  });

  it('does not count results while browsing history or twice', () => {
    let m = matchReducer(initialMatch(HVH), { type: 'startSeries', bestOf: 3 });
    m = play(m, ...X_WIN);
    const back = matchReducer(m, { type: 'jump', cursor: 2 });
    expect(matchReducer(back, { type: 'play', index: 8 }).series?.wins).toEqual({ A: 1, B: 0 });
    expect(matchReducer(m, { type: 'redo' }).series?.wins).toEqual({ A: 1, B: 0 });
    const loaded = matchReducer(m, { type: 'load', config: HVH, moves: [4] });
    expect(loaded.series).toBeNull();
  });
});
