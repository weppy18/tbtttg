import { describe, expect, it } from 'vitest';
import { EMPTY_DAILY, parseDaily, recordSolve, solvedToday } from './daily.ts';

describe('daily progress', () => {
  it('extends the streak on consecutive days and resets after a gap', () => {
    const d1 = new Date(2026, 8, 22);
    const d2 = new Date(2026, 8, 23);
    const d4 = new Date(2026, 8, 25);
    let p = recordSolve(EMPTY_DAILY, d1);
    expect(p.streak).toBe(1);
    expect(solvedToday(p, d1)).toBe(true);
    expect(solvedToday(p, d2)).toBe(false);
    expect(recordSolve(p, d1)).toBe(p); // idempotent for the same day
    p = recordSolve(p, d2);
    expect(p.streak).toBe(2);
    expect(p.best).toBe(2);
    p = recordSolve(p, d4);
    expect(p.streak).toBe(1);
    expect(p.best).toBe(2);
    expect(p.solvedCount).toBe(3);
  });

  it('crosses month boundaries', () => {
    const p = recordSolve(recordSolve(EMPTY_DAILY, new Date(2026, 8, 30)), new Date(2026, 9, 1));
    expect(p.streak).toBe(2);
  });

  it('parses persisted data', () => {
    expect(parseDaily(null)).toBeNull();
    expect(parseDaily({})).toEqual(EMPTY_DAILY);
    expect(parseDaily({ lastSolved: 20260922, streak: 3, best: -1, solvedCount: 'x' })).toEqual({
      lastSolved: 20260922,
      streak: 3,
      best: 0,
      solvedCount: 0,
    });
  });
});
