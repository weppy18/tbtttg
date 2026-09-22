import { describe, expect, it } from 'vitest';
import {
  analyseVariant,
  applyVariantMove,
  chooseVariantMove,
  createVariant,
  evaluateVariantMoves,
  gradeHeuristic,
  isLegalVariantMove,
  legalVariantMoves,
  replayVariant,
} from './adapter.ts';
import { seededRng } from './random.ts';
import { toMove } from './ultimate.ts';

describe('adapter', () => {
  it('routes board variants to the board engine', () => {
    const g = createVariant('five');
    expect(g.kind).toBe('board');
    expect(legalVariantMoves(g)).toHaveLength(25);
    const g2 = applyVariantMove(g, 12);
    expect(isLegalVariantMove(g2, 12)).toBe(false);
    expect(replayVariant('classic', [0, 3, 1, 4, 2]).status).toBe('won');
    expect(
      chooseVariantMove(replayVariant('classic', [0, 3, 1, 4]), 'impossible', seededRng(1)),
    ).toBe(2);
    expect(evaluateVariantMoves(replayVariant('classic', [0, 3, 1, 4]))[0]!.index).toBe(2);
    expect(analyseVariant('classic', [0, 4, 8, 2]).moves[3]!.quality).toBe('blunder');
  });

  it('routes ultimate to the ultimate engine', () => {
    const u = createVariant('ultimate');
    expect(u.kind).toBe('ultimate');
    expect(legalVariantMoves(u)).toHaveLength(81);
    const u2 = applyVariantMove(u, toMove(4, 4));
    expect(isLegalVariantMove(u2, toMove(0, 0))).toBe(false);
    expect(isLegalVariantMove(u2, toMove(4, 0))).toBe(true);
    expect(replayVariant('ultimate', [toMove(4, 4)]).moves).toEqual([toMove(4, 4)]);
    const mv = chooseVariantMove(u2, 'medium', seededRng(2));
    expect(isLegalVariantMove(u2, mv)).toBe(true);
    expect(evaluateVariantMoves(u2)).toHaveLength(8);
  });

  it('analyses ultimate games heuristically', () => {
    const a = analyseVariant('ultimate', [toMove(4, 4), toMove(4, 0), toMove(0, 4)]);
    expect(a.moves).toHaveLength(3);
    expect(
      a.summary.X.best +
        a.summary.X.good +
        a.summary.X.inaccuracy +
        a.summary.X.mistake +
        a.summary.X.blunder,
    ).toBe(2);
  });

  it('gradeHeuristic bands', () => {
    expect(gradeHeuristic(10, 10)).toBe('best');
    expect(gradeHeuristic(0, 30)).toBe('good');
    expect(gradeHeuristic(0, 100)).toBe('inaccuracy');
    expect(gradeHeuristic(0, 300)).toBe('mistake');
    expect(gradeHeuristic(0, 1000)).toBe('blunder');
  });
});
