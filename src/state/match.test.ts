import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  canRedo,
  canUndo,
  currentGame,
  difficultyFor,
  initialMatch,
  isAiSide,
  matchReducer,
  parseConfig,
  redoTarget,
  undoTarget,
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
    expect(g.board[4]).toBe('X');
    expect(g.board[0]).toBe('O');
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
    expect(currentGame(n).board).toHaveLength(25);
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
