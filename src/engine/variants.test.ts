import { describe, expect, it } from 'vitest';
import { assertRules } from './game.ts';
import {
  BOARD_VARIANT_IDS,
  VARIANT_IDS,
  isBoardVariant,
  isVariantId,
  rulesFor,
} from './variants.ts';

describe('variants', () => {
  it('every variant has valid rules', () => {
    for (const id of BOARD_VARIANT_IDS) expect(() => assertRules(rulesFor(id))).not.toThrow();
    expect(() => rulesFor('ultimate')).toThrow(RangeError);
    expect(VARIANT_IDS).toContain('ultimate');
    expect(isBoardVariant('ultimate')).toBe(false);
    expect(isBoardVariant('four')).toBe(true);
    expect(rulesFor('misere').misere).toBe(true);
    expect(rulesFor('five')).toEqual({ size: 5, winLength: 4, misere: false });
  });

  it('isVariantId guards strings', () => {
    expect(isVariantId('classic')).toBe(true);
    expect(isVariantId('nope')).toBe(false);
    expect(isVariantId(3)).toBe(false);
  });
});
