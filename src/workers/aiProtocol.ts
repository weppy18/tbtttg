import type { Difficulty, MoveEval, SearchOptions, VariantId } from '../engine/index.ts';

export type AiRequest =
  | {
      id: number;
      kind: 'move';
      variant: VariantId;
      moves: readonly number[];
      difficulty: Difficulty;
      seed: number;
    }
  | {
      id: number;
      kind: 'evaluate';
      variant: VariantId;
      moves: readonly number[];
      options: SearchOptions;
    };

export type AiResponse =
  { id: number; kind: 'move'; index: number } | { id: number; kind: 'evaluate'; evals: MoveEval[] };
