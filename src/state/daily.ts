import { dailySeed } from '../engine/index.ts';
import { isRecord } from '../lib/storage.ts';

/** Daily-puzzle progress: which day was last solved and the streak. */
export interface DailyProgress {
  readonly lastSolved: number | null;
  readonly streak: number;
  readonly best: number;
  readonly solvedCount: number;
}

export const EMPTY_DAILY: DailyProgress = { lastSolved: null, streak: 0, best: 0, solvedCount: 0 };

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0;
}

export function parseDaily(raw: unknown): DailyProgress | null {
  if (!isRecord(raw)) return null;
  return {
    lastSolved: typeof raw.lastSolved === 'number' ? Math.trunc(raw.lastSolved) : null,
    streak: num(raw.streak),
    best: num(raw.best),
    solvedCount: num(raw.solvedCount),
  };
}

/** Record today's solve. Consecutive calendar days extend the streak; re-solving today is a no-op. */
export function recordSolve(progress: DailyProgress, today: Date): DailyProgress {
  const seed = dailySeed(today);
  if (progress.lastSolved === seed) return progress;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const streak = progress.lastSolved === dailySeed(yesterday) ? progress.streak + 1 : 1;
  return {
    lastSolved: seed,
    streak,
    best: Math.max(progress.best, streak),
    solvedCount: progress.solvedCount + 1,
  };
}

export function solvedToday(progress: DailyProgress, today: Date): boolean {
  return progress.lastSolved === dailySeed(today);
}
