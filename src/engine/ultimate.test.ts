import { describe, expect, it } from 'vitest';
import { InvalidMoveError } from './game.ts';
import { seededRng } from './random.ts';
import {
  applyUltimateMove,
  boardOf,
  cellOf,
  chooseUltimateMove,
  createUltimate,
  evaluateUltimate,
  evaluateUltimateMoves,
  globalRowCol,
  isLegalUltimateMove,
  legalUltimateMoves,
  replayUltimate,
  toMove,
  ultimateDepthFor,
  type UltimateState,
} from './ultimate.ts';

const m = toMove;
type Cells = (null | 'X' | 'O')[];

/** Build a state with hand-set small boards / results (for targeted positions). */
function position(
  patch: Partial<UltimateState> & { board?: { index: number; cells: Cells } },
): UltimateState {
  const base = createUltimate();
  const { board, ...rest } = patch;
  return {
    ...base,
    ...rest,
    boards: board ? base.boards.map((b, i) => (i === board.index ? board.cells : b)) : base.boards,
  };
}

describe('ultimate rules', () => {
  it('starts free, then sends the opponent to the matching board', () => {
    const s0 = createUltimate();
    expect(s0.activeBoard).toBeNull();
    expect(legalUltimateMoves(s0)).toHaveLength(81);
    const s1 = applyUltimateMove(s0, m(4, 0));
    expect(s1.activeBoard).toBe(0);
    expect(s1.toMove).toBe('O');
    expect(legalUltimateMoves(s1)).toHaveLength(9);
    expect(isLegalUltimateMove(s1, m(1, 1))).toBe(false);
    expect(isLegalUltimateMove(s1, m(0, 1))).toBe(true);
    expect(() => applyUltimateMove(s1, m(1, 1))).toThrow(InvalidMoveError);
    expect(() => applyUltimateMove(s1, 81)).toThrow(InvalidMoveError);
    expect(isLegalUltimateMove(s1, 2.5)).toBe(false);
    expect(s0.boards[4]![0]).toBeNull(); // immutability
  });

  it('wins a small board and frees the move when sent to a decided board', () => {
    let s = createUltimate();
    s = applyUltimateMove(s, m(0, 0)); // X, O to board 0
    s = applyUltimateMove(s, m(0, 3)); // O, X to board 3
    s = applyUltimateMove(s, m(3, 0)); // X, O to board 0
    s = applyUltimateMove(s, m(0, 4)); // O, X to board 4
    s = applyUltimateMove(s, m(4, 0)); // X, O to board 0
    s = applyUltimateMove(s, m(0, 5)); // O wins board 0 (3,4,5)
    expect(s.results[0]).toBe('O');
    expect(s.activeBoard).toBe(5);
    s = applyUltimateMove(s, m(5, 0)); // sends O to the decided board 0 → free move
    expect(s.activeBoard).toBeNull();
    expect(legalUltimateMoves(s).every((mv) => boardOf(mv) !== 0)).toBe(true);
    expect(isLegalUltimateMove(s, m(0, 8))).toBe(false); // decided board, even on a free move
    expect(replayUltimate(s.moves)).toEqual(s);
  });

  it('a full small board with no winner is marked drawn', () => {
    const state = position({
      board: { index: 0, cells: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null] },
      activeBoard: 0,
    });
    const next = applyUltimateMove(state, m(0, 8));
    expect(next.results[0]).toBe('D');
    expect(next.activeBoard).toBe(8);
  });

  it('declares a draw when every board is decided without a macro line', () => {
    const state = position({
      results: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null],
      board: { index: 8, cells: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null] },
      activeBoard: 8,
    });
    const next = applyUltimateMove(state, m(8, 8));
    expect(next.status).toBe('draw');
    expect(next.winner).toBeNull();
  });

  it('macro win is detected', () => {
    const state = position({
      results: ['X', 'X', null, 'O', 'O', null, null, null, null],
      board: { index: 2, cells: ['X', 'X', null, null, null, null, null, null, null] },
      activeBoard: 2,
    });
    const next = applyUltimateMove(state, m(2, 2));
    expect(next.status).toBe('won');
    expect(next.winner).toBe('X');
    expect(next.winningLine).toEqual([0, 1, 2]);
    expect(legalUltimateMoves(next)).toEqual([]);
    expect(evaluateUltimateMoves(next, 2)).toEqual([]);
    expect(() => chooseUltimateMove(next, 'hard')).toThrow(RangeError);
    expect(() => applyUltimateMove(next, 0)).toThrow(/over/);
  });

  it('AI vs AI games always terminate with consistent results', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const rng = seededRng(seed);
      let s = createUltimate();
      while (s.status === 'playing') {
        s = applyUltimateMove(s, chooseUltimateMove(s, seed % 2 ? 'medium' : 'easy', rng));
      }
      if (s.status === 'won') {
        expect(s.winningLine).toHaveLength(3);
        for (const b of s.winningLine!) expect(s.results[b]).toBe(s.winner);
      } else {
        expect(s.results.every((r) => r !== null)).toBe(true);
      }
    }
  });

  it('coordinates', () => {
    expect(boardOf(m(7, 2))).toBe(7);
    expect(cellOf(m(7, 2))).toBe(2);
    expect(globalRowCol(m(0, 0))).toEqual([0, 0]);
    expect(globalRowCol(m(4, 4))).toEqual([4, 4]);
    expect(globalRowCol(m(8, 8))).toEqual([8, 8]);
    expect(globalRowCol(m(5, 3))).toEqual([4, 6]);
  });
});

describe('ultimate AI', () => {
  const nearWin = position({
    results: ['X', 'X', null, 'O', 'O', null, null, null, null],
    board: { index: 2, cells: ['X', 'X', null, null, null, null, null, null, null] },
    activeBoard: null,
  });

  it('takes a macro-winning move and blocks one', () => {
    expect(chooseUltimateMove(nearWin, 'hard', seededRng(1))).toBe(m(2, 2));
    expect(chooseUltimateMove(nearWin, 'impossible', seededRng(1))).toBe(m(2, 2));
    const oState: UltimateState = { ...nearWin, toMove: 'O', activeBoard: 2 };
    expect(chooseUltimateMove(oState, 'hard', seededRng(1))).toBe(m(2, 2));
    expect(chooseUltimateMove(oState, 'impossible', seededRng(1))).toBe(m(2, 2));
  });

  it('evaluation is antisymmetric and favours won boards', () => {
    const s = replayUltimate([m(4, 4), m(4, 0)]);
    expect(evaluateUltimate(s, 'X')).toBe(-evaluateUltimate(s, 'O'));
    const won = position({ results: ['X', null, null, null, null, null, null, null, null] });
    expect(evaluateUltimate(won, 'X')).toBeGreaterThan(0);
    const threat = position({ results: ['O', 'O', null, null, null, null, null, null, null] });
    expect(evaluateUltimate(threat, 'X')).toBeLessThan(0);
  });

  it('easy sometimes takes a small-board win and otherwise plays legally', () => {
    const state = position({
      board: { index: 0, cells: ['X', 'X', null, null, null, null, null, null, null] },
      activeBoard: 0,
    });
    const rng = seededRng(3);
    const picks = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const mv = chooseUltimateMove(state, 'easy', rng);
      expect(isLegalUltimateMove(state, mv)).toBe(true);
      picks.add(mv);
    }
    expect(picks.has(m(0, 2))).toBe(true);
    expect(picks.size).toBeGreaterThan(1);
  });

  it('respects the node budget on a free move and stops early on a forced win', () => {
    const t0 = performance.now();
    const evals = evaluateUltimateMoves(createUltimate(), 6, 20_000);
    expect(evals).toHaveLength(81);
    expect(performance.now() - t0).toBeLessThan(3000);
    const forced = evaluateUltimateMoves(nearWin, 6);
    expect(forced[0]!.index).toBe(m(2, 2));
  });

  it('stronger levels beat weaker ones over a few games', () => {
    let hardWins = 0;
    let easyWins = 0;
    for (let seed = 0; seed < 6; seed++) {
      const rng = seededRng(seed);
      let s = createUltimate();
      const hardIs = seed % 2 === 0 ? 'X' : 'O';
      while (s.status === 'playing') {
        const d = s.toMove === hardIs ? 'hard' : 'easy';
        s = applyUltimateMove(s, chooseUltimateMove(s, d, rng));
      }
      if (s.winner === hardIs) hardWins++;
      else if (s.winner) easyWins++;
    }
    expect(hardWins).toBeGreaterThan(easyWins);
  }, 30_000);

  it('depth table', () => {
    expect(ultimateDepthFor('easy')).toBeLessThan(ultimateDepthFor('medium'));
    expect(ultimateDepthFor('medium')).toBeLessThan(ultimateDepthFor('hard'));
    expect(ultimateDepthFor('hard')).toBeLessThan(ultimateDepthFor('impossible'));
  });
});
