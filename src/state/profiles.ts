import type { Player } from '../engine/index.ts';
import { isRecord } from '../lib/storage.ts';

/** How a player's mark is drawn: the classic strokes, or a short text/emoji. */
export interface Profile {
  readonly name: string;
  /** CSS colour used for this player's marks and accents. */
  readonly color: string;
  /** 'X' / 'O' for the drawn strokes, otherwise a 1–2 character glyph (emoji allowed). */
  readonly mark: string;
}

export type Profiles = Readonly<Record<Player, Profile>>;

export const MARK_PRESETS: readonly string[] = [
  'X',
  'O',
  '★',
  '♥',
  '🐱',
  '🐶',
  '🦊',
  '🐸',
  '🍕',
  '🚀',
  '⚡',
  '🌸',
];

export const COLOR_PRESETS: readonly string[] = [
  '#0e7fc7',
  '#d9376e',
  '#22a06b',
  '#e0a300',
  '#7c3aed',
  '#f97316',
  '#0891b2',
  '#111827',
];

export const DEFAULT_PROFILES: Profiles = {
  X: { name: '', color: '', mark: 'X' },
  O: { name: '', color: '', mark: 'O' },
};

export const MAX_NAME = 16;

/** Trim and clamp a display name. */
export function cleanName(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '';
}

/** Accept only hex colours (empty = theme default). */
export function cleanColor(v: unknown): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '';
}

/** Marks are 1–2 visible characters (a single emoji can be several code units). */
export function cleanMark(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const glyphs = [...v.trim()];
  if (glyphs.length === 0 || glyphs.length > 2) return fallback;
  return glyphs.join('');
}

function parseProfile(raw: unknown, fallback: Profile): Profile {
  if (!isRecord(raw)) return fallback;
  return {
    name: cleanName(raw.name),
    color: cleanColor(raw.color),
    mark: cleanMark(raw.mark, fallback.mark),
  };
}

export function parseProfiles(raw: unknown): Profiles | null {
  if (!isRecord(raw)) return null;
  return {
    X: parseProfile(raw.X, DEFAULT_PROFILES.X),
    O: parseProfile(raw.O, DEFAULT_PROFILES.O),
  };
}

/** True when the mark should be drawn as strokes rather than text. */
export function isStrokeMark(mark: string): mark is 'X' | 'O' {
  return mark === 'X' || mark === 'O';
}
