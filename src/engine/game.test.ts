import { describe, expect, it } from 'vitest';
import {
  InvalidMoveError,
  applyMove,
  assertRules,
  createGame,
  findLineThrough,
  isLegalMove,
  legalMoves,
  other,
  replay,
  toIndex,
  toRowCol,
  undo,
} from './game.ts';
import { CLASSIC_RULES, type Rules } from './types.ts';

const MISERE: Rules = { size: 3, winLength: 3, misere: true };
const FOUR: Rules = { size: 4, winLength: 4, misere: false };
const FIVE: Rules = { size: 5, winLength: 4, misere: false };

describe('createGame', () => {
  it('starts empty with X to move', () => {
    const g = createGame();
    expect(g.board).toHaveLength(9);
    expect(g.board.every((c) => c === null)).toBe(true);
    expect(g.toMove).toBe('X');
    expect(g.status).toBe('playing');
    expect(g.moves).toEqual([]);
    expect(g.winner).toBeNull();
    expect(g.winningLine).toBeNull();
  });

  it('honours board size', () => {
    expect(createGame(FIVE).board).toHaveLength(25);
  });

  it('rejects invalid rules', () => {
    expect(() => assertRules({ size: 2, winLength: 2, misere: false })).toThrow(RangeError);
    expect(() => assertRules({ size: 11, winLength: 3, misere: false })).toThrow(RangeError);
    expect(() => assertRules({ size: 3.5, winLength: 3, misere: false })).toThrow(RangeError);
    expect(() => assertRules({ size: 3, winLength: 4, misere: false })).toThrow(RangeError);
    expect(() => assertRules({ size: 3, winLength: 2, misere: false })).toThrow(RangeError);
    expect(() => assertRules({ size: 3, winLength: NaN, misere: false })).toThrow(RangeError);
    expect(() => createGame({ size: 1, winLength: 1, misere: false })).toThrow(RangeError);
  });
});

describe('applyMove', () => {
  it('places marks and alternates turns immutably', () => {
    const g0 = createGame();
    const g1 = applyMove(g0, 4);
    expect(g0.board[4]).toBeNull();
    expect(g1.board[4]).toBe('X');
    expect(g1.toMove).toBe('O');
    expect(g1.moves).toEqual([4]);
    const g2 = applyMove(g1, 0);
    expect(g2.board[0]).toBe('O');
    expect(g2.toMove).toBe('X');
  });

  it('rejects out-of-range, taken, and post-game moves', () => {
    const g = applyMove(createGame(), 4);
    expect(() => applyMove(g, 4)).toThrow(InvalidMoveError);
    expect(() => applyMove(g, -1)).toThrow(InvalidMoveError);
    expect(() => applyMove(g, 9)).toThrow(InvalidMoveError);
    expect(() => applyMove(g, 1.5)).toThrow(InvalidMoveError);
    const won = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
    expect(() => applyMove(won, 5)).toThrow(InvalidMoveError);
    try {
      applyMove(won, 5);
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidMoveError);
      expect((e as InvalidMoveError).index).toBe(5);
      expect((e as InvalidMoveError).name).toBe('InvalidMoveError');
    }
  });

  it('detects row, column, and diagonal wins', () => {
    const row = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
    expect(row.status).toBe('won');
    expect(row.winner).toBe('X');
    expect(row.winningLine).toEqual([0, 1, 2]);

    const col = replay(CLASSIC_RULES, [1, 0, 2, 3, 4, 6]);
    expect(col.winner).toBe('O');
    expect(col.winningLine).toEqual([0, 3, 6]);

    const diag = replay(CLASSIC_RULES, [0, 1, 4, 2, 8]);
    expect(diag.winner).toBe('X');
    expect(diag.winningLine).toEqual([0, 4, 8]);

    const anti = replay(CLASSIC_RULES, [2, 0, 4, 1, 6]);
    expect(anti.winner).toBe('X');
    expect(anti.winningLine).toEqual([2, 4, 6]);
  });

  it('detects draws', () => {
    // X O X / X O O / O X X
    const g = replay(CLASSIC_RULES, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(g.status).toBe('draw');
    expect(g.winner).toBeNull();
    expect(g.winningLine).toBeNull();
    expect(legalMoves(g)).toEqual([]);
  });

  it('prefers a win over a draw on the final move', () => {
    // X X O / O O X / X O X — last move (8) completes the anti-diagonal? No: 2,4,6 = O,O,X.
    // Build a full board where the ninth move wins: X O X / O X O / O X X with X last at 8 (diag 0,4,8).
    const g = replay(CLASSIC_RULES, [0, 1, 2, 3, 4, 5, 7, 6, 8]);
    expect(g.status).toBe('won');
    expect(g.winner).toBe('X');
  });

  it('handles misère: completing a line loses', () => {
    const g = replay(MISERE, [0, 3, 1, 4, 2]);
    expect(g.status).toBe('won');
    expect(g.winner).toBe('O');
    expect(g.winningLine).toEqual([0, 1, 2]);
  });

  it('supports 4x4 with 4-in-a-row and 5x5 with 4-in-a-row', () => {
    const g4 = replay(FOUR, [0, 4, 1, 5, 2, 6, 3]);
    expect(g4.winner).toBe('X');
    expect(g4.winningLine).toEqual([0, 1, 2, 3]);

    // 5x5, X plays anti-diagonal 3,7,11,15
    const g5 = replay(FIVE, [3, 0, 7, 1, 11, 2, 15]);
    expect(g5.winner).toBe('X');
    expect(g5.winningLine).toEqual([3, 7, 11, 15]);

    // three in a row is not enough on a 4-in-a-row board
    const g5b = replay(FIVE, [0, 5, 1, 6, 2]);
    expect(g5b.status).toBe('playing');
  });
});

describe('helpers', () => {
  it('other flips players', () => {
    expect(other('X')).toBe('O');
    expect(other('O')).toBe('X');
  });

  it('isLegalMove / legalMoves', () => {
    const g = applyMove(createGame(), 4);
    expect(isLegalMove(g, 4)).toBe(false);
    expect(isLegalMove(g, 0)).toBe(true);
    expect(isLegalMove(g, 9)).toBe(false);
    expect(isLegalMove(g, 0.5)).toBe(false);
    expect(legalMoves(g)).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
  });

  it('findLineThrough returns null for empty cells and no line', () => {
    const g = applyMove(createGame(), 4);
    expect(findLineThrough(g.board, g.rules, 0)).toBeNull();
    expect(findLineThrough(g.board, g.rules, 4)).toBeNull();
  });

  it('undo steps back one move and is a no-op on an empty board', () => {
    const g0 = createGame();
    expect(undo(g0)).toBe(g0);
    const g2 = replay(CLASSIC_RULES, [4, 0]);
    const g1 = undo(g2);
    expect(g1.moves).toEqual([4]);
    expect(g1.toMove).toBe('O');
    expect(g1.board[0]).toBeNull();
    const won = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
    expect(undo(won).status).toBe('playing');
  });

  it('coordinate conversion round-trips', () => {
    expect(toRowCol(7, 3)).toEqual([2, 1]);
    expect(toIndex(2, 1, 3)).toBe(7);
    for (let i = 0; i < 25; i++) {
      const [r, c] = toRowCol(i, 5);
      expect(toIndex(r, c, 5)).toBe(i);
    }
  });
});
