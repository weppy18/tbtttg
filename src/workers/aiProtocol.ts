import type { Difficulty, GameAnalysis, MoveEval, VariantId } from '../engine/index.ts';

export type AiRequest =
  | {
      id: number;
      kind: 'move';
      variant: VariantId;
      moves: readonly number[];
      difficulty: Difficulty;
      seed: number;
    }
  | { id: number; kind: 'evaluate'; variant: VariantId; moves: readonly number[] }
  | { id: number; kind: 'analyse'; variant: VariantId; moves: readonly number[] };

export type AiResponse =
  | { id: number; kind: 'move'; index: number }
  | { id: number; kind: 'evaluate'; evals: MoveEval[] }
  | { id: number; kind: 'analyse'; analysis: GameAnalysis };
