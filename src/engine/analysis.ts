import { depthFor, evaluateMoves, outcomeOf, type Outcome, type SearchOptions } from './ai.ts';
import { applyMove, createGame } from './game.ts';
import type { Player, Rules } from './types.ts';

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveReport {
  /** 0-based ply. */
  readonly ply: number;
  readonly player: Player;
  readonly index: number;
  /** Score of the played move (mover's perspective). */
  readonly score: number;
  /** Score of the best available move. */
  readonly bestScore: number;
  /** All moves sharing the best score. */
  readonly bestMoves: readonly number[];
  readonly quality: MoveQuality;
  readonly before: Outcome;
  readonly after: Outcome;
}

export interface GameAnalysis {
  readonly moves: readonly MoveReport[];
  readonly summary: Readonly<Record<Player, Readonly<Record<MoveQuality, number>>>>;
}

/** Search options that match the strongest AI on this board size. */
export function analysisOptions(rules: Rules): SearchOptions {
  return { maxDepth: depthFor('impossible', rules) };
}

const EMPTY_COUNTS: Record<MoveQuality, number> = {
  best: 0,
  good: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
};

/**
 * Classify a move by comparing the theoretical outcome before and after it.
 * "best" is an exact tie with the top move; "good" keeps the same outcome
 * (e.g. a slower win); anything that changes the outcome is graded by how far it falls.
 */
export function classify(
  score: number,
  bestScore: number,
  before: Outcome,
  after: Outcome,
): MoveQuality {
  if (score === bestScore) return 'best';
  if (before === after) return 'good';
  if (before === 'win' && after === 'draw') return 'mistake';
  if (before === 'draw' && after === 'loss') return 'blunder';
  return 'blunder'; // win → loss
}

/** Grade every move of a finished (or partial) game against best play. */
export function analyseGame(
  rules: Rules,
  moves: readonly number[],
  options: SearchOptions = analysisOptions(rules),
): GameAnalysis {
  const reports: MoveReport[] = [];
  const summary: Record<Player, Record<MoveQuality, number>> = {
    X: { ...EMPTY_COUNTS },
    O: { ...EMPTY_COUNTS },
  };
  let state = createGame(rules);
  moves.forEach((index, ply) => {
    const evals = evaluateMoves(state, options);
    const bestScore = evals[0]!.score;
    const played = evals.find((e) => e.index === index)!.score;
    const before = outcomeOf(bestScore);
    const after = outcomeOf(played);
    const quality = classify(played, bestScore, before, after);
    const player = state.toMove;
    reports.push({
      ply,
      player,
      index,
      score: played,
      bestScore,
      bestMoves: evals.filter((e) => e.score === bestScore).map((e) => e.index),
      quality,
      before,
      after,
    });
    summary[player][quality]++;
    state = applyMove(state, index);
  });
  return { moves: reports, summary };
}
