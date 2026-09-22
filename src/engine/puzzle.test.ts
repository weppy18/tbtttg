import { describe, expect, it } from 'vitest';
import { bestMoves, evaluatePosition, outcomeOf } from './ai.ts';
import { applyMove, replay } from './game.ts';
import { dailySeed, dailyVariant, generatePuzzle, isSolution, qualifies } from './puzzle.ts';
import { CLASSIC_RULES } from './types.ts';
import { rulesFor } from './variants.ts';

describe('daily puzzle', () => {
  it('seeds are stable per calendar day', () => {
    expect(dailySeed(new Date(2026, 8, 22))).toBe(20260922);
    expect(dailySeed(new Date(2026, 8, 22, 23, 59))).toBe(20260922);
    expect(dailyVariant(20260922)).toBeTypeOf('string');
  });

  it('generates a deterministic, valid puzzle with a unique non-trivial winning move', () => {
    const a = generatePuzzle(20260922);
    const b = generatePuzzle(20260922);
    expect(a).toEqual(b);
    const state = replay(rulesFor(a.variant), a.moves);
    expect(state.status).toBe('playing');
    expect(state.toMove).toBe(a.toMove);
    expect(bestMoves(state)).toEqual([a.solution]);
    expect(outcomeOf(evaluatePosition(state))).toBe('win');
    expect(applyMove(state, a.solution).status).toBe('playing');
    expect(isSolution(a, a.solution)).toBe(true);
    expect(isSolution(a, (a.solution + 1) % 9)).toBe(false);
  });

  it('works for a whole month of seeds, in both variants', () => {
    for (let day = 1; day <= 31; day++) {
      const seed = 20261000 + day;
      const p = generatePuzzle(seed);
      const state = replay(rulesFor(p.variant), p.moves);
      expect(qualifies(state)).toBe(p.solution);
    }
    expect(generatePuzzle(5, 'misere').variant).toBe('misere');
    expect(() => generatePuzzle(5, 'classic', 0)).toThrow(/No puzzle/);
  });

  it('qualifies() rejects trivial or non-winning positions', () => {
    expect(qualifies(replay(CLASSIC_RULES, []))).toBeNull();
    expect(qualifies(replay(CLASSIC_RULES, [0, 3, 1, 4]))).toBeNull(); // one-move win
    expect(qualifies(replay(CLASSIC_RULES, [0, 3, 1, 4, 2]))).toBeNull(); // over
    expect(qualifies(replay(CLASSIC_RULES, [0, 1, 2, 4, 3, 5, 7]))).toBeNull(); // too few moves left
  });
});
