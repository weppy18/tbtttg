import { describe, expect, it } from 'vitest';
import { assertRules } from './game.ts';
import { VARIANT_IDS, isVariantId, rulesFor } from './variants.ts';

describe('variants', () => {
  it('every variant has valid rules', () => {
    for (const id of VARIANT_IDS) expect(() => assertRules(rulesFor(id))).not.toThrow();
    expect(rulesFor('misere').misere).toBe(true);
    expect(rulesFor('five')).toEqual({ size: 5, winLength: 4, misere: false });
  });

  it('isVariantId guards strings', () => {
    expect(isVariantId('classic')).toBe(true);
    expect(isVariantId('nope')).toBe(false);
    expect(isVariantId(3)).toBe(false);
  });
});
