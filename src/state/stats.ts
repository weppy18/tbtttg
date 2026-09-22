import type { GameState, Player } from '../engine/index.ts';
import { isRecord } from '../lib/storage.ts';
import type { MatchConfig } from './match.ts';

/** Tally for one (variant, mode, difficulty) bucket. */
export interface Tally {
  readonly x: number;
  readonly o: number;
  readonly draws: number;
  /** Player on the current winning streak and its length. */
  readonly streakPlayer: Player | null;
  readonly streak: number;
  /** Longest streak ever, per player. */
  readonly bestStreak: Readonly<Record<Player, number>>;
}

export type Stats = Readonly<Record<string, Tally>>;

export const EMPTY_TALLY: Tally = {
  x: 0,
  o: 0,
  draws: 0,
  streakPlayer: null,
  streak: 0,
  bestStreak: { X: 0, O: 0 },
};

/** Bucket key: difficulty only matters when an AI is involved. */
export function statsKey(config: MatchConfig): string {
  switch (config.mode) {
    case 'hvh':
      return `${config.variant}|hvh`;
    case 'hva':
      return `${config.variant}|hva|${config.difficulty}|${config.humanSide}`;
    case 'ava':
      return `${config.variant}|ava|${config.difficulty}|${config.difficultyO}`;
  }
}

export function recordResult(tally: Tally, game: GameState): Tally {
  if (game.status === 'won' && game.winner) {
    const w = game.winner;
    const streak = tally.streakPlayer === w ? tally.streak + 1 : 1;
    return {
      ...tally,
      x: tally.x + (w === 'X' ? 1 : 0),
      o: tally.o + (w === 'O' ? 1 : 0),
      streakPlayer: w,
      streak,
      bestStreak: { ...tally.bestStreak, [w]: Math.max(tally.bestStreak[w], streak) },
    };
  }
  if (game.status === 'draw') {
    return { ...tally, draws: tally.draws + 1, streakPlayer: null, streak: 0 };
  }
  return tally;
}

export function recordGame(stats: Stats, config: MatchConfig, game: GameState): Stats {
  const key = statsKey(config);
  return { ...stats, [key]: recordResult(stats[key] ?? EMPTY_TALLY, game) };
}

export function games(t: Tally): number {
  return t.x + t.o + t.draws;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0;
}

function parseTally(raw: unknown): Tally | null {
  if (!isRecord(raw)) return null;
  const sp = raw.streakPlayer;
  const best = isRecord(raw.bestStreak) ? raw.bestStreak : {};
  return {
    x: num(raw.x),
    o: num(raw.o),
    draws: num(raw.draws),
    streakPlayer: sp === 'X' || sp === 'O' ? sp : null,
    streak: num(raw.streak),
    bestStreak: { X: num(best.X), O: num(best.O) },
  };
}

export function parseStats(raw: unknown): Stats | null {
  if (!isRecord(raw)) return null;
  const out: Record<string, Tally> = {};
  for (const [k, v] of Object.entries(raw)) {
    const t = parseTally(v);
    if (t) out[k] = t;
  }
  return out;
}
