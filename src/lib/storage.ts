/**
 * Tiny, safe localStorage wrapper. Every read is validated by the caller's
 * `parse` so corrupt or stale data falls back to defaults instead of crashing.
 */

const PREFIX = 'tttg:';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  const s = storage();
  if (!s) return fallback;
  try {
    const raw = s.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed = parse(JSON.parse(raw));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode: persistence is best-effort.
  }
}

export function removeKey(key: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function oneOf<T extends string>(v: unknown, options: readonly T[]): T | null {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : null;
}
