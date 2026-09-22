import { describe, expect, it } from 'vitest';
import { decodeGame, encodeGame, readSharedGame, shareUrl } from './share.ts';

describe('share codes', () => {
  it('round-trips games on every board size', () => {
    const g = { variant: 'five' as const, moves: [12, 0, 13, 24, 14, 1, 15] };
    expect(decodeGame(encodeGame(g))).toEqual(g);
    expect(encodeGame({ variant: 'classic', moves: [4, 0, 8, 2] })).toBe('classic.4082');
    expect(decodeGame('classic.')).toEqual({ variant: 'classic', moves: [] });
  });

  it('rejects garbage', () => {
    expect(decodeGame('nope.123')).toBeNull();
    expect(decodeGame('classic.1-2')).toBeNull();
    expect(decodeGame('')).toBeNull();
  });

  it('builds and reads URLs', () => {
    const url = shareUrl({ variant: 'misere', moves: [4, 0] }, 'https://x.test/app/?foo=1#bar');
    expect(url).toBe('https://x.test/app/?g=misere.40');
    expect(readSharedGame(url)).toEqual({ variant: 'misere', moves: [4, 0] });
    expect(readSharedGame('https://x.test/app/')).toBeNull();
    expect(readSharedGame('not a url')).toBeNull();
  });
});
