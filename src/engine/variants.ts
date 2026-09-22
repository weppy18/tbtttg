import type { Rules } from './types.ts';

/** Board-based variants (Ultimate has its own engine, see ./ultimate). */
export type VariantId = 'classic' | 'misere' | 'four' | 'five';

export const VARIANT_IDS: readonly VariantId[] = ['classic', 'misere', 'four', 'five'];

export const VARIANT_RULES: Readonly<Record<VariantId, Rules>> = {
  classic: { size: 3, winLength: 3, misere: false },
  misere: { size: 3, winLength: 3, misere: true },
  four: { size: 4, winLength: 4, misere: false },
  five: { size: 5, winLength: 4, misere: false },
};

export function rulesFor(id: VariantId): Rules {
  return VARIANT_RULES[id];
}

export function isVariantId(v: unknown): v is VariantId {
  return typeof v === 'string' && (VARIANT_IDS as readonly string[]).includes(v);
}
