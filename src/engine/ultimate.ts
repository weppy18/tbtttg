import { InvalidMoveError, other } from './game.ts';
import { allLines } from './lines.ts';
import { pick, type Rng } from './random.ts';
import type { Difficulty } from './ai.ts';
import type { Cell, GameStatus, Player } from './types.ts';

/**
 * Ultimate Tic-Tac-Toe: nine 3×3 boards arranged in a 3×3 macro board.
 * A move in cell c of a small board sends the opponent to small board c.
 * Win three small boards in a line to win the game.
 *
 * Moves are encoded as a single index 0–80 = board * 9 + cell.
 */

/** Result of a small board: a winner, 'D' for full with no winner, or null while open. */
export type BoardResult = Player | 'D' | null;

export interface UltimateState {
  readonly kind: 'ultimate';
  /** 9 small boards, each 9 cells, row-major in both dimensions. */
  readonly boards: readonly (readonly Cell[])[];
  readonly results: readonly BoardResult[];
  readonly toMove: Player;
  /** Small board the mover must play in, or null for a free choice. */
  readonly activeBoard: number | null;
  readonly moves: readonly number[];
  readonly status: GameStatus;
  readonly winner: Player | null;
  /** Macro cells (small boards) forming the winning line, if any. */
  readonly winningLine: readonly number[] | null;
}

const RULES3 = { size: 3, winLength: 3 } as const;

export function boardOf(move: number): number {
  return Math.floor(move / 9);
}
export function cellOf(move: number): number {
  return move % 9;
}
export function toMove(board: number, cell: number): number {
  return board * 9 + cell;
}

/** Global 9x9 coordinates (0-based row, col) of a move. */
export function globalRowCol(move: number): [number, number] {
  const b = boardOf(move);
  const c = cellOf(move);
  return [Math.floor(b / 3) * 3 + Math.floor(c / 3), (b % 3) * 3 + (c % 3)];
}

export function createUltimate(): UltimateState {
  return {
    kind: 'ultimate',
    boards: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Cell => null)),
    results: Array.from({ length: 9 }, (): BoardResult => null),
    toMove: 'X',
    activeBoard: null,
    moves: [],
    status: 'playing',
    winner: null,
    winningLine: null,
  };
}

/** Line of `mark`s through any of the 8 lines of a 3×3 array, or null. */
function lineOn(cells: readonly (Cell | 'D')[], mark: Player): readonly number[] | null {
  for (const line of allLines(RULES3)) {
    if (line.every((i) => cells[i] === mark)) return line;
  }
  return null;
}

export function isLegalUltimateMove(state: UltimateState, move: number): boolean {
  if (state.status !== 'playing' || !Number.isInteger(move) || move < 0 || move >= 81) return false;
  const b = boardOf(move);
  if (state.results[b] !== null) return false;
  if (state.activeBoard !== null && state.activeBoard !== b) return false;
  return state.boards[b]![cellOf(move)] === null;
}

export function legalUltimateMoves(state: UltimateState): number[] {
  if (state.status !== 'playing') return [];
  const out: number[] = [];
  const boards = state.activeBoard === null ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [state.activeBoard];
  for (const b of boards) {
    if (state.results[b] !== null) continue;
    const cells = state.boards[b]!;
    for (let c = 0; c < 9; c++) if (cells[c] === null) out.push(toMove(b, c));
  }
  return out;
}

export function applyUltimateMove(state: UltimateState, move: number): UltimateState {
  if (!isLegalUltimateMove(state, move)) {
    throw new InvalidMoveError(
      state.status !== 'playing' ? 'Game is over' : `Illegal move ${move}`,
      move,
    );
  }
  const b = boardOf(move);
  const c = cellOf(move);
  const boards = state.boards.map((cells, i) => {
    if (i !== b) return cells;
    const next = cells.slice();
    next[c] = state.toMove;
    return next;
  });
  const results = state.results.slice();
  const small = boards[b]!;
  if (lineOn(small, state.toMove)) results[b] = state.toMove;
  else if (small.every((x) => x !== null)) results[b] = 'D';

  const moves = [...state.moves, move];
  const next = other(state.toMove);
  const macroLine = results[b] === state.toMove ? lineOn(results, state.toMove) : null;
  if (macroLine) {
    return {
      ...state,
      boards,
      results,
      moves,
      toMove: next,
      activeBoard: null,
      status: 'won',
      winner: state.toMove,
      winningLine: macroLine,
    };
  }
  const activeBoard = results[c] === null ? c : null;
  const anyOpen = results.some((r) => r === null);
  if (!anyOpen) {
    return {
      ...state,
      boards,
      results,
      moves,
      toMove: next,
      activeBoard: null,
      status: 'draw',
      winner: null,
      winningLine: null,
    };
  }
  return {
    ...state,
    boards,
    results,
    moves,
    toMove: next,
    activeBoard,
    status: 'playing',
    winner: null,
    winningLine: null,
  };
}

export function replayUltimate(moves: readonly number[]): UltimateState {
  let s = createUltimate();
  for (const m of moves) s = applyUltimateMove(s, m);
  return s;
}

/* ------------------------------------------------------------------ */
/* AI                                                                   */
/* ------------------------------------------------------------------ */

const WIN_SCORE = 1_000_000;

/** Heuristic value of a small 3×3 board for `player` (open boards only). */
function smallScore(cells: readonly Cell[], player: Player): number {
  let s = 0;
  for (const line of allLines(RULES3)) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      const c = cells[i];
      if (c === player) mine++;
      else if (c !== null) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 2) s += 6;
    else if (mine === 1) s += 1;
    else if (theirs === 2) s -= 6;
    else if (theirs === 1) s -= 1;
  }
  if (cells[4] === player) s += 2;
  else if (cells[4] !== null) s -= 2;
  return s;
}

/** Weight of each macro cell: the centre and corners are on more lines. */
const MACRO_WEIGHT = [3, 2, 3, 2, 4, 2, 3, 2, 3] as const;

/**
 * Static evaluation for the side to move: macro-line potential dominates,
 * small-board potential breaks ties.
 */
export function evaluateUltimate(state: UltimateState, player: Player): number {
  let score = 0;
  const r = state.results;
  for (let b = 0; b < 9; b++) {
    if (r[b] === player) score += 100 * MACRO_WEIGHT[b]!;
    else if (r[b] === other(player)) score -= 100 * MACRO_WEIGHT[b]!;
    else if (r[b] === null) score += smallScore(state.boards[b]!, player) * MACRO_WEIGHT[b]! * 0.5;
  }
  for (const line of allLines(RULES3)) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      if (r[i] === player) mine++;
      else if (r[i] !== null) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 2) score += 400;
    else if (theirs === 2) score -= 400;
  }
  return score;
}

class UltimateSearcher {
  nodes = 0;
  constructor(private readonly budget: number) {}

  /** Negamax with alpha-beta. Throws 'budget' when out of nodes so the caller can fall back. */
  search(state: UltimateState, depth: number, alpha: number, beta: number, ply: number): number {
    if (++this.nodes > this.budget) throw new Error('budget');
    // The previous player just completed a macro line: the side to move has lost.
    if (state.status === 'won') return -(WIN_SCORE - ply);
    if (state.status === 'draw') return 0;
    if (depth === 0) return evaluateUltimate(state, state.toMove);
    let best = -Infinity;
    for (const m of orderedMoves(state)) {
      const score = -this.search(applyUltimateMove(state, m), depth - 1, -beta, -alpha, ply + 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/** Centre cells first, and moves that send the opponent to a decided board (free move) last. */
function orderedMoves(state: UltimateState): number[] {
  const moves = legalUltimateMoves(state);
  const key = (m: number) => {
    const c = cellOf(m);
    let k = c === 4 ? 0 : c % 2 === 0 ? 1 : 2;
    if (state.results[c] !== null) k += 3;
    return k;
  };
  return moves.sort((a, b) => key(a) - key(b));
}

export interface UltimateEval {
  readonly index: number;
  readonly score: number;
}

/**
 * Evaluate every legal move with iterative deepening up to `maxDepth`,
 * bounded by a node budget so it stays responsive even on a free move.
 */
export function evaluateUltimateMoves(
  state: UltimateState,
  maxDepth: number,
  budget = 250_000,
): UltimateEval[] {
  const moves = orderedMoves(state);
  if (moves.length === 0) return [];
  let result: UltimateEval[] = moves.map((index) => ({ index, score: 0 }));
  const searcher = new UltimateSearcher(budget);
  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      const evals = moves.map((index) => ({
        index,
        score: -searcher.search(applyUltimateMove(state, index), depth - 1, -Infinity, Infinity, 1),
      }));
      evals.sort((a, b) => b.score - a.score);
      result = evals;
      // Stop early on a forced result.
      if (Math.abs(evals[0]!.score) > WIN_SCORE - 100) break;
    } catch {
      break; // out of budget: keep the last completed depth
    }
  }
  return result;
}

export function ultimateDepthFor(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 4;
    case 'impossible':
      return 6;
  }
}

/** Pick a move for the side to move. Easy is mostly random; the rest search. */
export function chooseUltimateMove(
  state: UltimateState,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): number {
  const legal = legalUltimateMoves(state);
  if (legal.length === 0) throw new RangeError('No legal moves: the game is over');
  if (difficulty === 'easy') {
    // Take a small-board win half the time, otherwise wander.
    const wins = legal.filter((m) => {
      const b = boardOf(m);
      return applyUltimateMove(state, m).results[b] === state.toMove;
    });
    if (wins.length > 0 && rng() < 0.5) return pick(wins, rng);
    return pick(legal, rng);
  }
  if (difficulty === 'medium' && rng() < 0.25) return pick(legal, rng);
  const evals = evaluateUltimateMoves(state, ultimateDepthFor(difficulty));
  const top = evals[0]!.score;
  return pick(
    evals.filter((e) => e.score === top).map((e) => e.index),
    rng,
  );
}
