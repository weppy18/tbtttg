import { isVariantId, type VariantId } from '../engine/index.ts';

/**
 * Compact, URL-safe game encoding: `<variant>.<moves>` where each move is
 * one base-36 digit (boards up to 36 cells). Example: `classic.4083`.
 */
export interface SharedGame {
  readonly variant: VariantId;
  readonly moves: readonly number[];
}

export const SHARE_PARAM = 'g';

export function encodeGame(game: SharedGame): string {
  return `${game.variant}.${game.moves.map((m) => m.toString(36)).join('')}`;
}

export function decodeGame(code: string): SharedGame | null {
  const [variant, digits = ''] = code.split('.');
  if (!isVariantId(variant)) return null;
  if (!/^[0-9a-z]*$/.test(digits)) return null;
  return { variant, moves: [...digits].map((d) => parseInt(d, 36)) };
}

/** Build a share URL for the current page. */
export function shareUrl(game: SharedGame, base: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set(SHARE_PARAM, encodeGame(game));
  return url.toString();
}

/** Read a shared game from a URL's query string, if any. */
export function readSharedGame(href: string): SharedGame | null {
  try {
    const code = new URL(href).searchParams.get(SHARE_PARAM);
    return code ? decodeGame(code) : null;
  } catch {
    return null;
  }
}
