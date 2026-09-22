import { evaluateMoves, outcomeOf } from './ai.ts';
import { applyMove, createGame, legalMoves } from './game.ts';
import { seededRng, type Rng } from './random.ts';
import type { GameState, Player, Rules } from './types.ts';
import { rulesFor, type BoardVariantId } from './variants.ts';

/**
 * "Find the winning move" puzzles: random positions where the side to move has
 * exactly one winning move, and that move doesn't simply complete a line.
 * Generation is deterministic for a seed, so everyone gets the same daily puzzle.
 */
export interface Puzzle {
  readonly variant: BoardVariantId;
  readonly moves: readonly number[];
  readonly toMove: Player;
  /** The unique winning move. */
  readonly solution: number;
  readonly seed: number;
}

/** Variants that rotate through the week; all are fully solved so wins are proven. */
const DAILY_VARIANTS: readonly BoardVariantId[] = [
  'classic',
  'classic',
  'misere',
  'classic',
  'misere',
  'classic',
  'classic',
];

/** A stable seed for a calendar day (local time). */
export function dailySeed(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function dailyVariant(seed: number): BoardVariantId {
  return DAILY_VARIANTS[seed % DAILY_VARIANTS.length]!;
}

/** Does `state` qualify: unique winning move that isn't an immediate line completion? */
export function qualifies(state: GameState): number | null {
  if (state.status !== 'playing' || state.moves.length < 2) return null;
  const evals = evaluateMoves(state);
  if (evals.length < 3) return null;
  const top = evals[0]!;
  if (outcomeOf(top.score) !== 'win') return null;
  if (evals.filter((e) => e.score === top.score).length !== 1) return null;
  // Not a one-move win: the game must continue after the solution.
  if (applyMove(state, top.index).status !== 'playing') return null;
  return top.index;
}

/** Random playout that stops at the first qualifying position, or null if none appears. */
function tryGenerate(rules: Rules, rng: Rng): { moves: number[]; solution: number } | null {
  let state = createGame(rules);
  const moves: number[] = [];
  while (state.status === 'playing') {
    const solution = qualifies(state);
    if (solution !== null) return { moves, solution };
    const legal = legalMoves(state);
    const m = legal[Math.floor(rng() * legal.length)]!;
    moves.push(m);
    state = applyMove(state, m);
  }
  return null;
}

/** Generate the puzzle for a seed. Always succeeds on 3×3 within a few playouts. */
export function generatePuzzle(
  seed: number,
  variant: BoardVariantId = dailyVariant(seed),
  maxAttempts = 1000,
): Puzzle {
  const rules = rulesFor(variant);
  const rng = seededRng(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryGenerate(rules, rng);
    if (result) {
      return {
        variant,
        moves: result.moves,
        toMove: result.moves.length % 2 === 0 ? 'X' : 'O',
        solution: result.solution,
        seed,
      };
    }
  }
  throw new Error(`No puzzle found for seed ${seed}`);
}

export function isSolution(puzzle: Puzzle, move: number): boolean {
  return move === puzzle.solution;
}
