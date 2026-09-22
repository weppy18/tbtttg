import { describe, expect, it } from 'vitest';
import { allLines, linesThrough } from './lines.ts';

describe('allLines', () => {
  it('has 8 lines on 3x3', () => {
    const lines = allLines({ size: 3, winLength: 3 });
    expect(lines).toHaveLength(8);
    expect(lines).toContainEqual([0, 1, 2]);
    expect(lines).toContainEqual([0, 3, 6]);
    expect(lines).toContainEqual([0, 4, 8]);
    expect(lines).toContainEqual([2, 4, 6]);
  });

  it('has 10 lines on 4x4 with 4-in-a-row', () => {
    expect(allLines({ size: 4, winLength: 4 })).toHaveLength(10);
  });

  it('has 28 lines on 5x5 with 4-in-a-row', () => {
    // rows: 5*2, cols: 5*2, diagonals: 4+4
    expect(allLines({ size: 5, winLength: 4 })).toHaveLength(28);
  });

  it('is cached', () => {
    expect(allLines({ size: 3, winLength: 3 })).toBe(allLines({ size: 3, winLength: 3 }));
  });
});

describe('linesThrough', () => {
  it('centre of 3x3 is on 4 lines, corner on 3, edge on 2', () => {
    const t = linesThrough({ size: 3, winLength: 3 });
    expect(t[4]).toHaveLength(4);
    expect(t[0]).toHaveLength(3);
    expect(t[1]).toHaveLength(2);
    expect(t).toHaveLength(9);
  });

  it('is cached', () => {
    expect(linesThrough({ size: 4, winLength: 4 })).toBe(linesThrough({ size: 4, winLength: 4 }));
  });
});
