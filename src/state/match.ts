import {
  DIFFICULTIES,
  PERSONALITIES,
  applyVariantMove,
  createVariant,
  isLegalVariantMove,
  isVariantId,
  other,
  replayVariant,
  type AnyGame,
  type Difficulty,
  type Personality,
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
  /** Playing style of the AI side in 'hva', and of X in 'ava'. */
  readonly personality: Personality;
  /** Playing style of O in 'ava'. */
  readonly personalityO: Personality;
}

export const DEFAULT_CONFIG: MatchConfig = {
  variant: 'classic',
  mode: 'hva',
  humanSide: 'X',
  difficulty: 'medium',
  difficultyO: 'medium',
  personality: 'balanced',
  personalityO: 'balanced',
};

/** Participant in a series: A is whoever plays X in game 1. */
export type Seat = 'A' | 'B';

export interface Series {
  readonly bestOf: number;
  /** 0-based index of the current game. Odd games swap seats. */
  readonly game: number;
  readonly wins: Readonly<Record<Seat, number>>;
  readonly draws: number;
  /** True once the current game's result has been counted. */
  readonly recorded: boolean;
}

export const SERIES_LENGTHS: readonly number[] = [3, 5, 7];

export interface MatchState {
  readonly config: MatchConfig;
  /** Best-of-N series, or null for casual play. */
  readonly series: Series | null;
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
  | { type: 'load'; config: MatchConfig; moves: readonly number[]; cursor?: number }
  | { type: 'startSeries'; bestOf: number }
  | { type: 'endSeries' };

export function initialMatch(config: MatchConfig = DEFAULT_CONFIG): MatchState {
  return { config, series: null, moves: [], cursor: 0, gameId: 0, invalid: null };
}

/** Odd series games swap seats: X is played by whoever was O in game 1. */
export function isSwapped(match: MatchState): boolean {
  return match.series !== null && match.series.game % 2 === 1;
}

/** The series seat currently playing `player`. */
export function seatOf(match: MatchState, player: Player): Seat {
  return (player === 'X') !== isSwapped(match) ? 'A' : 'B';
}

/** Wins needed to take a best-of-N series. */
export function winsNeeded(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

/** Winning seat once decided, else null. Draws never decide a series. */
export function seriesWinner(series: Series): Seat | null {
  const need = winsNeeded(series.bestOf);
  if (series.wins.A >= need) return 'A';
  if (series.wins.B >= need) return 'B';
  return null;
}

/** Count the finished live game into the series (idempotent). */
function recordSeriesResult(match: MatchState): MatchState {
  const { series } = match;
  if (!series || series.recorded || match.cursor !== match.moves.length) return match;
  const game = currentGame(match);
  if (game.status === 'playing') return match;
  if (game.status === 'draw') {
    return { ...match, series: { ...series, draws: series.draws + 1, recorded: true } };
  }
  const seat = seatOf(match, game.winner!);
  return {
    ...match,
    series: { ...series, wins: { ...series.wins, [seat]: series.wins[seat] + 1 }, recorded: true },
  };
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

/** Personality of the AI playing `player` (mirrors {@link matchDifficulty}). */
export function matchPersonality(match: MatchState, player: Player): Personality {
  const seat = match.config.mode === 'ava' && isSwapped(match) ? other(player) : player;
  return match.config.mode === 'ava' && seat === 'O'
    ? match.config.personalityO
    : match.config.personality;
}

/** Difficulty for the AI playing `player` in this match, honouring series seat swaps. */
export function matchDifficulty(match: MatchState, player: Player): Difficulty {
  if (match.config.mode === 'ava' && isSwapped(match))
    return difficultyFor(match.config, other(player));
  return difficultyFor(match.config, player);
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
      return recordSeriesResult({ ...match, moves, cursor: moves.length, invalid: null });
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
      // Changing the setup ends any series; "play again" inside one advances it.
      if (action.config || !match.series) {
        const config = { ...match.config, ...action.config };
        return {
          ...match,
          config,
          series: null,
          moves: [],
          cursor: 0,
          gameId: match.gameId + 1,
          invalid: null,
        };
      }
      const counted = recordSeriesResult(match);
      const series = counted.series!;
      if (seriesWinner(series)) return counted; // series over: stay on the final board
      const next: Series = { ...series, game: series.game + 1, recorded: false };
      // Versus the AI the human physically changes sides; other modes swap via seats.
      const config =
        match.config.mode === 'hva'
          ? { ...match.config, humanSide: other(match.config.humanSide) }
          : match.config;
      return {
        ...counted,
        config,
        series: next,
        moves: [],
        cursor: 0,
        gameId: match.gameId + 1,
        invalid: null,
      };
    }
    case 'startSeries': {
      const bestOf = SERIES_LENGTHS.includes(action.bestOf) ? action.bestOf : 3;
      return {
        ...match,
        series: { bestOf, game: 0, wins: { A: 0, B: 0 }, draws: 0, recorded: false },
        moves: [],
        cursor: 0,
        gameId: match.gameId + 1,
        invalid: null,
      };
    }
    case 'endSeries':
      return match.series ? { ...match, series: null } : match;
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
        series: null,
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
  // Personalities were added later: older saved configs default to balanced.
  const personality = oneOf(raw.personality, PERSONALITIES) ?? 'balanced';
  const personalityO = oneOf(raw.personalityO, PERSONALITIES) ?? 'balanced';
  return { variant, mode, humanSide, difficulty, difficultyO, personality, personalityO };
}
