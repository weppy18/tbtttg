import { applyMove, legalMoves, other } from './game.ts';
import { allLines } from './lines.ts';
import { pick, seededRng, type Rng } from './random.ts';
import type { Cell, GameState, Player, Rules } from './types.ts';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'impossible'];

/** Magnitude of a proven win. Wins found sooner score higher: WIN - ply. */
export const WIN = 10_000;

/** Scores above this are proven wins; below the negation, proven losses. */
const PROVEN = WIN - 100;

export interface MoveEval {
  readonly index: number;
  /** Score from the perspective of the player to move. Positive is good for them. */
  readonly score: number;
}

export interface SearchOptions {
  /** Plies to search. Omit for a complete (perfect) search. */
  readonly maxDepth?: number;
}

/* ------------------------------------------------------------------ */
/* Static evaluation                                                    */
/* ------------------------------------------------------------------ */

const LINE_WEIGHTS = [0, 1, 10, 100, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];

/**
 * Heuristic value of a non-terminal board for `player`: sum over every line
 * of a weight that grows with how many of the player's marks it holds, minus
 * the same for the opponent. Lines containing both marks are dead and score 0.
 * In misère the sign flips — being close to a line is bad.
 */
export function evaluateBoard(board: readonly Cell[], rules: Rules, player: Player): number {
  let score = 0;
  for (const line of allLines(rules)) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      const c = board[i];
      if (c === player) mine++;
      else if (c !== null) theirs++;
    }
    if (mine > 0 && theirs > 0) continue;
    if (mine > 0) score += LINE_WEIGHTS[mine]!;
    else if (theirs > 0) score -= LINE_WEIGHTS[theirs]!;
  }
  return rules.misere ? -score : score;
}

/* ------------------------------------------------------------------ */
/* Negamax with alpha-beta and a transposition table                   */
/* ------------------------------------------------------------------ */

type Flag = 0 | 1 | 2; // exact, lower bound, upper bound
interface TTEntry {
  score: number;
  flag: Flag;
  best: number;
}

class Searcher {
  private readonly table = new Map<string, TTEntry>();
  private readonly order: readonly number[];
  nodes = 0;

  constructor(rules: Rules) {
    // Try central cells first — they lie on more lines, which tightens alpha-beta.
    const n = rules.size * rules.size;
    const mid = (rules.size - 1) / 2;
    this.order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
      const da = Math.abs(Math.floor(a / rules.size) - mid) + Math.abs((a % rules.size) - mid);
      const db = Math.abs(Math.floor(b / rules.size) - mid) + Math.abs((b % rules.size) - mid);
      return da - db;
    });
  }

  /** Score of `state` for the side to move, searching `depth` more plies (Infinity = full). */
  search(state: GameState, depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes++;
    if (state.status === 'won') {
      // The previous player just moved. If they are the winner, we lost.
      return state.winner === state.toMove ? WIN - ply : -(WIN - ply);
    }
    if (state.status === 'draw') return 0;
    if (depth === 0) return evaluateBoard(state.board, state.rules, state.toMove);

    const key = this.key(state.board);
    const alphaOrig = alpha;
    // Remaining depth is a function of ply (which the board fixes), so a hit
    // was always searched to exactly this depth — no depth check needed.
    const hit = this.table.get(key);
    let firstMove = -1;
    if (hit) {
      firstMove = hit.best;
      if (hit.flag === 0) return hit.score;
      if (hit.flag === 1) alpha = Math.max(alpha, hit.score);
      else beta = Math.min(beta, hit.score);
      if (alpha >= beta) return hit.score;
    }

    let best = -Infinity;
    let bestMove = -1;
    const tryMove = (i: number): boolean => {
      const score = -this.search(applyMove(state, i), depth - 1, -beta, -alpha, ply + 1);
      if (score > best) {
        best = score;
        bestMove = i;
      }
      alpha = Math.max(alpha, score);
      return alpha >= beta;
    };

    let cut = false;
    if (firstMove >= 0 && state.board[firstMove] === null) cut = tryMove(firstMove);
    if (!cut) {
      for (const i of this.order) {
        if (i === firstMove || state.board[i] !== null) continue;
        if (tryMove(i)) break;
      }
    }

    const flag: Flag = best <= alphaOrig ? 2 : best >= beta ? 1 : 0;
    this.table.set(key, { score: best, flag, best: bestMove });
    return best;
  }

  private key(board: readonly Cell[]): string {
    let s = '';
    for (const c of board) s += c ?? '.';
    return s;
  }
}

/** Depth used by a "complete" search: enough plies to fill the board. */
function fullDepth(state: GameState): number {
  return state.board.length - state.moves.length;
}

/**
 * Evaluate every legal move, from the perspective of the player to move.
 * Sorted best-first. Empty when the game is over.
 */
export function evaluateMoves(state: GameState, options: SearchOptions = {}): MoveEval[] {
  const moves = legalMoves(state);
  if (moves.length === 0) return [];
  const depth = Math.min(options.maxDepth ?? Infinity, fullDepth(state));
  const searcher = new Searcher(state.rules);
  const results = moves.map((index) => ({
    index,
    score: -searcher.search(applyMove(state, index), depth - 1, -Infinity, Infinity, 1),
  }));
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Best score achievable by the player to move (see {@link evaluateMoves}). */
export function evaluatePosition(state: GameState, options: SearchOptions = {}): number {
  const evals = evaluateMoves(state, options);
  if (evals.length === 0) {
    if (state.status === 'draw') return 0;
    return state.winner === state.toMove ? WIN : -WIN;
  }
  return evals[0]!.score;
}

export type Outcome = 'win' | 'draw' | 'loss';

/** Classify a score (from the mover's perspective) as a proven outcome or draw-ish. */
export function outcomeOf(score: number): Outcome {
  if (score > PROVEN) return 'win';
  if (score < -PROVEN) return 'loss';
  return 'draw';
}

/** All moves that share the top score. */
export function bestMoves(state: GameState, options: SearchOptions = {}): number[] {
  const evals = evaluateMoves(state, options);
  if (evals.length === 0) return [];
  const top = evals[0]!.score;
  return evals.filter((e) => e.score === top).map((e) => e.index);
}

/* ------------------------------------------------------------------ */
/* Difficulty levels                                                    */
/* ------------------------------------------------------------------ */

/** Moves that win immediately for the player to move (or lose, in misère — we still call them "completing"). */
function completingMoves(state: GameState): number[] {
  return legalMoves(state).filter((i) => applyMove(state, i).status === 'won');
}

/** Moves that complete a line in the mover's favour (wins in normal play; never in misère). */
function winningMoves(state: GameState): number[] {
  return completingMoves(state).filter((i) => applyMove(state, i).winner === state.toMove);
}

/** Cells where the opponent would win next turn if left alone. */
function blockingMoves(state: GameState): number[] {
  if (state.rules.misere) return [];
  const asOpponent: GameState = { ...state, toMove: other(state.toMove) };
  return winningMoves(asOpponent);
}

/** Moves that do not immediately lose (in misère: do not complete a line). */
function safeMoves(state: GameState): number[] {
  const losing = new Set(state.rules.misere ? completingMoves(state) : []);
  return legalMoves(state).filter((i) => !losing.has(i));
}

/**
 * Search depth for a level on a given board. 3×3 is fully solved at "impossible";
 * larger boards use a deep but bounded search so moves stay instant.
 */
export function depthFor(difficulty: Difficulty, rules: Rules): number {
  const big = rules.size >= 5;
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return rules.size === 3 ? Infinity : big ? 3 : 4;
    case 'hard':
      return rules.size === 3 ? 2 : 3;
    case 'impossible':
      return rules.size === 3 ? Infinity : big ? 4 : 6;
  }
}

/**
 * Pick a move for the side to move at the given difficulty.
 *
 * - easy: mostly random; takes wins half the time, blocks 40% of the time.
 * - medium: always plays 1-ply tactics (win/block), otherwise 65% best move, 35% random.
 * - hard: shallow heuristic search — sound tactically but can be out-planned (forked).
 * - impossible: perfect play on 3×3; deep search elsewhere.
 *
 * @throws RangeError if the game is over.
 */
export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): number {
  const legal = legalMoves(state);
  if (legal.length === 0) throw new RangeError('No legal moves: the game is over');

  switch (difficulty) {
    case 'easy': {
      const wins = winningMoves(state);
      if (wins.length > 0 && rng() < 0.5) return pick(wins, rng);
      const blocks = blockingMoves(state);
      if (blocks.length > 0 && rng() < 0.4) return pick(blocks, rng);
      const safe = safeMoves(state);
      return pick(safe.length > 0 ? safe : legal, rng);
    }
    case 'medium': {
      const wins = winningMoves(state);
      if (wins.length > 0) return pick(wins, rng);
      const blocks = blockingMoves(state);
      if (blocks.length > 0) return pick(blocks, rng);
      if (rng() < 0.35) {
        const safe = safeMoves(state);
        return pick(safe.length > 0 ? safe : legal, rng);
      }
      return pick(bestMoves(state, { maxDepth: depthFor('medium', state.rules) }), rng);
    }
    case 'hard':
    case 'impossible':
      return pick(bestMoves(state, { maxDepth: depthFor(difficulty, state.rules) }), rng);
  }
}

/** Convenience: a reproducible RNG for a given seed (re-exported for callers). */
export { seededRng };
