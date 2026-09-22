import { describe, expect, it } from 'vitest';
import { pick, seededRng } from './random.ts';

describe('seededRng', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = seededRng(123);
    const b = seededRng(123);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(seededRng(1)()).not.toBe(seededRng(2)());
  });
});

describe('pick', () => {
  it('returns an element and throws on empty', () => {
    const rng = seededRng(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) expect(items).toContain(pick(items, rng));
    expect(() => pick([], rng)).toThrow(RangeError);
  });
});
