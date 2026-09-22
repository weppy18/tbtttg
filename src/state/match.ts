import {
  DIFFICULTIES,
  applyVariantMove,
  createVariant,
  isLegalVariantMove,
  isVariantId,
  replayVariant,
  type AnyGame,
  type Difficulty,
  type Player,
  type VariantId,
} from '../engine/index.ts';
import { isRecord, oneOf } from '../lib/storage.ts';

export type Mode = 'hvh' | 'hva' | 'ava';
export const MODES: readonly Mode[] = ['hvh', 'hva', 'ava'];

export interface MatchConfig {
  readonly variant: VariantId;
  readonly mode: Mode;
  /** Side the human plays in 'hva'. */
  readonly humanSide: Player;
  /** AI level for the AI side in 'hva', and for X in 'ava'. */
  readonly difficulty: Difficulty;
  /** AI level for O in 'ava'. */
  readonly difficultyO: Difficulty;
}

export const DEFAULT_CONFIG: MatchConfig = {
  variant: 'classic',
  mode: 'hva',
  humanSide: 'X',
  difficulty: 'medium',
  difficultyO: 'medium',
};

export interface MatchState {
  readonly config: MatchConfig;
  /** Full move list, including moves beyond `cursor` (the redo tail). */
  readonly moves: readonly number[];
  /** Number of moves currently applied. */
  readonly cursor: number;
  /** Bumps on every new game so the UI can reset per-game animation state. */
  readonly gameId: number;
  /** Last rejected click, for the shake animation. */
  readonly invalid: { readonly index: number; readonly nonce: number } | null;
}

export type MatchAction =
  | { type: 'play'; index: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'jump'; cursor: number }
  | { type: 'newGame'; config?: Partial<MatchConfig> }
  | { type: 'load'; config: MatchConfig; moves: readonly number[]; cursor?: number };

export function initialMatch(config: MatchConfig = DEFAULT_CONFIG): MatchState {
  return { config, moves: [], cursor: 0, gameId: 0, invalid: null };
}

/** The engine state at the current cursor. Cheap (≤ 25 moves), memoise in React. */
export function currentGame(match: MatchState): AnyGame {
  return replayVariant(match.config.variant, match.moves.slice(0, match.cursor));
}

/** Whether `player` is driven by the AI under this config. */
export function isAiSide(config: MatchConfig, player: Player): boolean {
  if (config.mode === 'ava') return true;
  if (config.mode === 'hva') return player !== config.humanSide;
  return false;
}

export function difficultyFor(config: MatchConfig, player: Player): Difficulty {
  if (config.mode === 'ava' && player === 'O') return config.difficultyO;
  return config.difficulty;
}

/** Who moves at position `cursor` (X moves at even positions). */
function moverAt(cursor: number): Player {
  return cursor % 2 === 0 ? 'X' : 'O';
}

/**
 * Where undo lands: the position before the last move made by a human.
 * In hvh/ava every move is "human-driven" for this purpose (one ply back).
 */
export function undoTarget(match: MatchState): number {
  if (match.config.mode !== 'hva') return Math.max(0, match.cursor - 1);
  for (let i = match.cursor - 1; i >= 0; i--) {
    if (moverAt(i) === match.config.humanSide) return i;
  }
  return 0;
}

/** Where redo lands: the next position where a human is on move, or the end. */
export function redoTarget(match: MatchState): number {
  const end = match.moves.length;
  if (match.config.mode !== 'hva') return Math.min(end, match.cursor + 1);
  for (let j = match.cursor + 1; j < end; j++) {
    if (moverAt(j) === match.config.humanSide) return j;
  }
  return end;
}

export function canUndo(match: MatchState): boolean {
  return match.cursor > 0;
}

export function canRedo(match: MatchState): boolean {
  return match.cursor < match.moves.length;
}

export function matchReducer(match: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'play': {
      const game = currentGame(match);
      if (!isLegalVariantMove(game, action.index)) {
        return {
          ...match,
          invalid: { index: action.index, nonce: (match.invalid?.nonce ?? 0) + 1 },
        };
      }
      const moves = [...match.moves.slice(0, match.cursor), action.index];
      return { ...match, moves, cursor: moves.length, invalid: null };
    }
    case 'undo': {
      if (!canUndo(match)) return match;
      return { ...match, cursor: undoTarget(match), invalid: null };
    }
    case 'redo': {
      if (!canRedo(match)) return match;
      return { ...match, cursor: redoTarget(match), invalid: null };
    }
    case 'jump': {
      const cursor = Math.max(0, Math.min(match.moves.length, Math.trunc(action.cursor)));
      return { ...match, cursor, invalid: null };
    }
    case 'newGame': {
      const config = { ...match.config, ...action.config };
      return { config, moves: [], cursor: 0, gameId: match.gameId + 1, invalid: null };
    }
    case 'load': {
      // Validate by replaying; keep only the legal prefix.
      let game = createVariant(action.config.variant);
      const valid: number[] = [];
      for (const m of action.moves) {
        if (!isLegalVariantMove(game, m)) break;
        game = applyVariantMove(game, m);
        valid.push(m);
      }
      const cursor =
        action.cursor === undefined
          ? valid.length
          : Math.max(0, Math.min(valid.length, action.cursor));
      return {
        config: action.config,
        moves: valid,
        cursor,
        gameId: match.gameId + 1,
        invalid: null,
      };
    }
  }
}

export function parseConfig(raw: unknown): MatchConfig | null {
  if (!isRecord(raw)) return null;
  const variant = isVariantId(raw.variant) ? raw.variant : null;
  const mode = oneOf(raw.mode, MODES);
  const humanSide = oneOf(raw.humanSide, ['X', 'O'] as const);
  const difficulty = oneOf(raw.difficulty, DIFFICULTIES);
  const difficultyO = oneOf(raw.difficultyO, DIFFICULTIES);
  if (!variant || !mode || !humanSide || !difficulty || !difficultyO) return null;
  return { variant, mode, humanSide, difficulty, difficultyO };
}
