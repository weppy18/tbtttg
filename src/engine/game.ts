import { linesThrough } from './lines.ts';
import { CLASSIC_RULES, type Cell, type GameState, type Player, type Rules } from './types.ts';

export class InvalidMoveError extends Error {
  constructor(
    message: string,
    public readonly index: number,
  ) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

export function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

/** Validate a rule set; throws on nonsense so bad configs fail loudly. */
export function assertRules(rules: Rules): void {
  if (!Number.isInteger(rules.size) || rules.size < 3 || rules.size > 10) {
    throw new RangeError(`Board size must be an integer in [3, 10], got ${rules.size}`);
  }
  if (!Number.isInteger(rules.winLength) || rules.winLength < 3 || rules.winLength > rules.size) {
    throw new RangeError(`Win length must be an integer in [3, size], got ${rules.winLength}`);
  }
}

/** A fresh game with an empty board. */
export function createGame(rules: Rules = CLASSIC_RULES): GameState {
  assertRules(rules);
  return {
    rules,
    board: Array.from({ length: rules.size * rules.size }, (): Cell => null),
    toMove: 'X',
    moves: [],
    status: 'playing',
    winner: null,
    winningLine: null,
  };
}

export function isLegalMove(state: GameState, index: number): boolean {
  return (
    state.status === 'playing' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < state.board.length &&
    state.board[index] === null
  );
}

/** Indices of all empty cells (empty when the game is over). */
export function legalMoves(state: GameState): number[] {
  if (state.status !== 'playing') return [];
  const out: number[] = [];
  for (let i = 0; i < state.board.length; i++) if (state.board[i] === null) out.push(i);
  return out;
}

/** Find a completed line through `index` for the mark at that cell, if any. */
export function findLineThrough(
  board: readonly Cell[],
  rules: Rules,
  index: number,
): readonly number[] | null {
  const mark = board[index];
  if (!mark) return null;
  for (const line of linesThrough(rules)[index]!) {
    let complete = true;
    for (const i of line) {
      if (board[i] !== mark) {
        complete = false;
        break;
      }
    }
    if (complete) return line;
  }
  return null;
}

/**
 * Apply a move. Returns a new state; the input is untouched.
 * @throws InvalidMoveError when the game is over, the index is out of range, or the cell is taken.
 */
export function applyMove(state: GameState, index: number): GameState {
  if (state.status !== 'playing') throw new InvalidMoveError('Game is over', index);
  if (!Number.isInteger(index) || index < 0 || index >= state.board.length) {
    throw new InvalidMoveError(`Cell ${index} is out of range`, index);
  }
  if (state.board[index] !== null) throw new InvalidMoveError(`Cell ${index} is taken`, index);

  const board = state.board.slice();
  board[index] = state.toMove;
  const moves = [...state.moves, index];
  const toMove = other(state.toMove);
  const line = findLineThrough(board, state.rules, index);

  if (line) {
    // Misère: the player who completes a line loses.
    const winner = state.rules.misere ? toMove : state.toMove;
    return { ...state, board, moves, toMove, status: 'won', winner, winningLine: line };
  }
  if (moves.length === board.length) {
    return { ...state, board, moves, toMove, status: 'draw', winner: null, winningLine: null };
  }
  return { ...state, board, moves, toMove, status: 'playing', winner: null, winningLine: null };
}

/** Rebuild a state from a move list. Throws on any illegal move. */
export function replay(rules: Rules, moves: readonly number[]): GameState {
  let state = createGame(rules);
  for (const m of moves) state = applyMove(state, m);
  return state;
}

/** State before the last move (no-op on an empty board). */
export function undo(state: GameState): GameState {
  if (state.moves.length === 0) return state;
  return replay(state.rules, state.moves.slice(0, -1));
}

/** Convert a row-major index to [row, col]. */
export function toRowCol(index: number, size: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

/** Convert [row, col] to a row-major index. */
export function toIndex(row: number, col: number, size: number): number {
  return row * size + col;
}
