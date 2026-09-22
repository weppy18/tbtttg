import { evaluateMoves, outcomeOf, type MoveEval, type SearchOptions } from './ai.ts';
import { applyMove } from './game.ts';
import { allLines } from './lines.ts';
import { pick, type Rng } from './random.ts';
import type { Cell, GameState, Player } from './types.ts';

/**
 * Personalities shape *which* of the equally-good moves an AI prefers. They
 * never make it weaker: candidates are always moves that keep the best
 * achievable outcome (win / draw / loss) at the AI's search depth.
 */
export type Personality = 'balanced' | 'aggressive' | 'defensive' | 'trickster';

export const PERSONALITIES: readonly Personality[] = [
  'balanced',
  'aggressive',
  'defensive',
  'trickster',
];

export function isPersonality(v: unknown): v is Personality {
  return typeof v === 'string' && (PERSONALITIES as readonly string[]).includes(v);
}

/** Lines holding only `player`'s marks, weighted by how many (2-in-a-row counts a lot). */
function threatScore(board: readonly Cell[], state: GameState, player: Player): number {
  let score = 0;
  for (const line of allLines(state.rules)) {
    let mine = 0;
    let blocked = false;
    for (const i of line) {
      const c = board[i];
      if (c === player) mine++;
      else if (c !== null) blocked = true;
    }
    if (blocked || mine === 0) continue;
    score += mine >= state.rules.winLength - 1 ? 10 : mine;
  }
  return score;
}

/** Moves that keep the same theoretical outcome as the best move. */
export function outcomePreservingMoves(evals: readonly MoveEval[]): MoveEval[] {
  if (evals.length === 0) return [];
  const best = outcomeOf(evals[0]!.score);
  return evals.filter((e) => outcomeOf(e.score) === best);
}

/**
 * Choose among `evals` (sorted best-first) according to a personality.
 * - balanced: any move sharing the top score.
 * - aggressive: an outcome-preserving move that builds the most threats (and takes wins fastest).
 * - defensive: an outcome-preserving move that leaves the opponent the fewest threats.
 * - trickster: an outcome-preserving move after which the opponent has the most losing replies.
 */
export function pickByPersonality(
  state: GameState,
  evals: readonly MoveEval[],
  personality: Personality,
  rng: Rng = Math.random,
  options: SearchOptions = {},
): number {
  if (evals.length === 0) throw new RangeError('No moves to choose from');
  const top = evals[0]!.score;
  if (personality === 'balanced') {
    return pick(
      evals.filter((e) => e.score === top).map((e) => e.index),
      rng,
    );
  }
  const me = state.toMove;
  const them: Player = me === 'X' ? 'O' : 'X';
  const candidates = outcomePreservingMoves(evals);
  const scored = candidates.map((e) => {
    const next = applyMove(state, e.index);
    let key: number;
    switch (personality) {
      case 'aggressive':
        // Immediate wins first, then the position with the most own threats.
        key =
          next.status === 'won' && next.winner === me ? 1e6 : threatScore(next.board, state, me);
        break;
      case 'defensive':
        key = next.status !== 'playing' ? 1e6 : -threatScore(next.board, state, them);
        break;
      case 'trickster': {
        if (next.status !== 'playing') {
          key = next.winner === me ? 1e6 : 0;
          break;
        }
        // Count opponent replies that lose (from the opponent's perspective).
        const replies = evaluateMoves(next, options);
        key = replies.filter((r) => outcomeOf(r.score) === 'loss').length;
        break;
      }
    }
    return { index: e.index, key };
  });
  const best = Math.max(...scored.map((s) => s.key));
  return pick(
    scored.filter((s) => s.key === best).map((s) => s.index),
    rng,
  );
}
