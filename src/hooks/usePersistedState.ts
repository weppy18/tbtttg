import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readJson, writeJson } from '../lib/storage.ts';

/**
 * `useState` mirrored to localStorage. `parse` validates whatever is on disk;
 * returning null falls back to `initial`.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readJson(key, parse, initial));
  useEffect(() => writeJson(key, value), [key, value]);
  return [value, setValue];
}
