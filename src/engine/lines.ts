import type { Rules } from './types.ts';

type LineRules = Pick<Rules, 'size' | 'winLength'>;

const linesCache = new Map<string, readonly (readonly number[])[]>();
const throughCache = new Map<string, readonly (readonly (readonly number[])[])[]>();

function key(rules: LineRules): string {
  return `${rules.size}:${rules.winLength}`;
}

/**
 * All K-length line segments on an N×N board (rows, columns, both diagonals),
 * as arrays of row-major cell indices. Cached per (size, winLength).
 */
export function allLines(rules: LineRules): readonly (readonly number[])[] {
  const k = key(rules);
  const cached = linesCache.get(k);
  if (cached) return cached;

  const { size, winLength } = rules;
  const lines: number[][] = [];
  const dirs: readonly (readonly [number, number])[] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of dirs) {
        const endR = r + dr * (winLength - 1);
        const endC = c + dc * (winLength - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
        const line: number[] = [];
        for (let i = 0; i < winLength; i++) line.push((r + dr * i) * size + (c + dc * i));
        lines.push(line);
      }
    }
  }
  linesCache.set(k, lines);
  return lines;
}

/** Lines passing through each cell, indexed by cell. Cached per (size, winLength). */
export function linesThrough(rules: LineRules): readonly (readonly (readonly number[])[])[] {
  const k = key(rules);
  const cached = throughCache.get(k);
  if (cached) return cached;

  const n = rules.size * rules.size;
  const result: (readonly number[])[][] = Array.from({ length: n }, () => []);
  for (const line of allLines(rules)) {
    for (const idx of line) result[idx]!.push(line);
  }
  throughCache.set(k, result);
  return result;
}
