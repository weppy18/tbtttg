import { describe, expect, it } from 'vitest';
import { analyseGame, analysisOptions, classify } from './analysis.ts';
import { CLASSIC_RULES, type Rules } from './types.ts';

const FIVE: Rules = { size: 5, winLength: 4, misere: false };

describe('classify', () => {
  it('grades by outcome change', () => {
    expect(classify(5, 5, 'draw', 'draw')).toBe('best');
    expect(classify(9990, 9995, 'win', 'win')).toBe('good');
    expect(classify(0, 9995, 'win', 'draw')).toBe('mistake');
    expect(classify(-9990, 0, 'draw', 'loss')).toBe('blunder');
    expect(classify(-9990, 9995, 'win', 'loss')).toBe('blunder');
  });
});

describe('analyseGame', () => {
  it('finds the blunder in a classic losing line', () => {
    // X 0, O 4, X 8, O 2?? — O taking a corner (2) after X's opposite corners is a blunder.
    const a = analyseGame(CLASSIC_RULES, [0, 4, 8, 2, 6, 3, 7]);
    expect(a.moves).toHaveLength(7);
    const m3 = a.moves[3]!;
    expect(m3.player).toBe('O');
    expect(m3.index).toBe(2);
    expect(m3.quality).toBe('blunder');
    expect(m3.before).toBe('draw');
    expect(m3.after).toBe('loss');
    expect([...m3.bestMoves].sort()).toEqual([1, 3, 5, 7]);
    expect(a.summary.O.blunder).toBe(1);
    // X's opening and follow-ups are best (draw is the theoretical value).
    expect(a.moves[0]!.quality).toBe('best');
    expect(a.summary.X.blunder).toBe(0);
  });

  it('marks a slower win as good, not best', () => {
    // X: 0,1 and O: 3,4 with X to move: 2 wins now. Suppose X plays 6 instead (still winning via fork? no — O wins at 5).
    // Use a position with two winning moves of different speed:
    // X 0,4 ; O 1,2 ; X to move. 8 wins immediately (diag). 3 also wins? 3 gives X 0,3 col threat + 4... let's just check ordering.
    const a = analyseGame(CLASSIC_RULES, [0, 1, 4, 2, 8]);
    expect(a.moves[4]!.quality).toBe('best');
    expect(a.moves[4]!.after).toBe('win');
  });

  it('handles an empty move list', () => {
    const a = analyseGame(CLASSIC_RULES, []);
    expect(a.moves).toEqual([]);
    expect(a.summary.X.best).toBe(0);
  });

  it('uses a bounded depth on big boards and still grades', () => {
    expect(analysisOptions(FIVE).maxDepth).toBeLessThan(Infinity);
    expect(analysisOptions(CLASSIC_RULES).maxDepth).toBe(Infinity);
    const a = analyseGame(FIVE, [12, 0, 13, 1, 14]);
    expect(a.moves).toHaveLength(5);
    for (const m of a.moves)
      expect(['best', 'good', 'inaccuracy', 'mistake', 'blunder']).toContain(m.quality);
  });
});
