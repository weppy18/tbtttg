import type { Rules } from './types.ts';

/** Variants played on a single N×N board. */
export type BoardVariantId = 'classic' | 'misere' | 'four' | 'five';
/** Every variant, including Ultimate (nine boards, see ./ultimate). */
export type VariantId = BoardVariantId | 'ultimate';

export const BOARD_VARIANT_IDS: readonly BoardVariantId[] = ['classic', 'misere', 'four', 'five'];
export const VARIANT_IDS: readonly VariantId[] = [...BOARD_VARIANT_IDS, 'ultimate'];

export const VARIANT_RULES: Readonly<Record<BoardVariantId, Rules>> = {
  classic: { size: 3, winLength: 3, misere: false },
  misere: { size: 3, winLength: 3, misere: true },
  four: { size: 4, winLength: 4, misere: false },
  five: { size: 5, winLength: 4, misere: false },
};

export function isBoardVariant(id: VariantId): id is BoardVariantId {
  return id !== 'ultimate';
}

/** Rules for a board variant. @throws for 'ultimate', which has no single-board rules. */
export function rulesFor(id: VariantId): Rules {
  if (!isBoardVariant(id)) throw new RangeError('Ultimate has no single-board rules');
  return VARIANT_RULES[id];
}

export function isVariantId(v: unknown): v is VariantId {
  return typeof v === 'string' && (VARIANT_IDS as readonly string[]).includes(v);
}
