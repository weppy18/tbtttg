/** A player mark. X always moves first. */
export type Player = 'X' | 'O';

/** A board cell: a player mark or empty. */
export type Cell = Player | null;

/** Rule set for a square-board K-in-a-row game. */
export interface Rules {
  /** Board side length (3 → 3×3). */
  readonly size: number;
  /** Marks in a row needed to complete a line. */
  readonly winLength: number;
  /** Misère: completing a line LOSES instead of wins. */
  readonly misere: boolean;
}

export type GameStatus = 'playing' | 'won' | 'draw';

/** Immutable snapshot of a game. Never mutate — every engine function returns a new state. */
export interface GameState {
  readonly kind: 'board';
  readonly rules: Rules;
  /** Row-major cells, length size*size. */
  readonly board: readonly Cell[];
  /** Player whose turn it is (meaningless once status !== 'playing'). */
  readonly toMove: Player;
  /** Cell indices played so far, in order. */
  readonly moves: readonly number[];
  readonly status: GameStatus;
  /** Winner when status === 'won'. In misère this is the player who did NOT complete the line. */
  readonly winner: Player | null;
  /** Cells of the completed line (for highlighting), when one exists. */
  readonly winningLine: readonly number[] | null;
}

export const CLASSIC_RULES: Rules = { size: 3, winLength: 3, misere: false };
