import { chooseMove, evaluateMoves, type Difficulty, type MoveEval } from './ai.ts';
import {
  analyseGame,
  analysisOptions,
  classify,
  type GameAnalysis,
  type MoveQuality,
  type MoveReport,
} from './analysis.ts';
import { applyMove, createGame, isLegalMove, legalMoves, replay } from './game.ts';
import type { Rng } from './random.ts';
import type { GameState, Player } from './types.ts';
import {
  applyUltimateMove,
  chooseUltimateMove,
  createUltimate,
  evaluateUltimateMoves,
  isLegalUltimateMove,
  legalUltimateMoves,
  replayUltimate,
  ultimateDepthFor,
  type UltimateState,
} from './ultimate.ts';
import { isBoardVariant, rulesFor, type VariantId } from './variants.ts';

/**
 * One entry point per operation regardless of variant, so the store, worker
 * and UI never branch on the engine themselves.
 */
export type AnyGame = GameState | UltimateState;

export function createVariant(variant: VariantId): AnyGame {
  return isBoardVariant(variant) ? createGame(rulesFor(variant)) : createUltimate();
}

export function replayVariant(variant: VariantId, moves: readonly number[]): AnyGame {
  return isBoardVariant(variant) ? replay(rulesFor(variant), moves) : replayUltimate(moves);
}

export function applyVariantMove(game: AnyGame, move: number): AnyGame {
  return game.kind === 'board' ? applyMove(game, move) : applyUltimateMove(game, move);
}

export function isLegalVariantMove(game: AnyGame, move: number): boolean {
  return game.kind === 'board' ? isLegalMove(game, move) : isLegalUltimateMove(game, move);
}

export function legalVariantMoves(game: AnyGame): number[] {
  return game.kind === 'board' ? legalMoves(game) : legalUltimateMoves(game);
}

export function chooseVariantMove(game: AnyGame, difficulty: Difficulty, rng?: Rng): number {
  return game.kind === 'board'
    ? chooseMove(game, difficulty, rng)
    : chooseUltimateMove(game, difficulty, rng);
}

/** Strongest available evaluation of every legal move (used for hints). */
export function evaluateVariantMoves(game: AnyGame): MoveEval[] {
  return game.kind === 'board'
    ? evaluateMoves(game, analysisOptions(game.rules))
    : evaluateUltimateMoves(game, ultimateDepthFor('impossible'));
}

/** Analysis depth for Ultimate: one step below the top AI so 40+ plies stay quick. */
const ULTIMATE_ANALYSIS_DEPTH = 4;

/** Grade a whole game. Ultimate scores are heuristic, so grades are relative rather than proven. */
export function analyseVariant(variant: VariantId, moves: readonly number[]): GameAnalysis {
  if (isBoardVariant(variant)) return analyseGame(rulesFor(variant), moves);

  const reports: MoveReport[] = [];
  const counts = (): Record<MoveQuality, number> => ({
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  });
  const summary: Record<Player, Record<MoveQuality, number>> = { X: counts(), O: counts() };
  let state = createUltimate();
  moves.forEach((index, ply) => {
    const evals = evaluateUltimateMoves(state, ULTIMATE_ANALYSIS_DEPTH);
    const bestScore = evals[0]!.score;
    const score = evals.find((e) => e.index === index)!.score;
    const quality = gradeHeuristic(score, bestScore);
    const player = state.toMove;
    reports.push({
      ply,
      player,
      index,
      score,
      bestScore,
      bestMoves: evals.filter((e) => e.score === bestScore).map((e) => e.index),
      quality,
      before: 'draw',
      after: 'draw',
    });
    summary[player][quality]++;
    state = applyUltimateMove(state, index);
  });
  return { moves: reports, summary };
}

/** Heuristic grading by score drop, for engines without a proven outcome. */
export function gradeHeuristic(score: number, bestScore: number): MoveQuality {
  const drop = bestScore - score;
  if (drop <= 0) return 'best';
  if (drop < 60) return 'good';
  if (drop < 200) return 'inaccuracy';
  if (drop < 600) return 'mistake';
  return 'blunder';
}

// Re-exported so callers that already import the adapter don't need analysis.ts too.
export { classify };
