import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { boardOf, globalRowCol, toMove, type UltimateState } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { Mark } from './Mark.tsx';

export interface UltimateBoardProps {
  game: UltimateState;
  name: string;
  interactive: boolean;
  onPlay: (move: number) => void;
  invalid: { index: number; nonce: number } | null;
  hint?: number | null;
  /** Per-move annotation classes (analysis), keyed by move index 0–80. */
  annotations?: ReadonlyMap<number, string>;
  gameId: number;
}

function moveAt(row: number, col: number): number {
  const b = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const c = (row % 3) * 3 + (col % 3);
  return toMove(b, c);
}

/**
 * Nine small boards in a macro grid. Keyboard users navigate the 9×9 grid with
 * arrows (roving tabindex); the board(s) currently playable are highlighted.
 */
export function UltimateBoard({
  game,
  name,
  interactive,
  onPlay,
  invalid,
  hint = null,
  annotations,
  gameId,
}: UltimateBoardProps) {
  const t = useT();
  const cells = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [focused, setFocused] = useState(toMove(4, 4));
  const [seenGame, setSeenGame] = useState(gameId);
  if (seenGame !== gameId) {
    setSeenGame(gameId);
    setFocused(toMove(4, 4));
  }
  const lastMove = game.moves.length > 0 ? game.moves[game.moves.length - 1]! : -1;

  const moveFocus = useCallback((row: number, col: number) => {
    const r = ((row % 9) + 9) % 9;
    const c = ((col % 9) + 9) % 9;
    const mv = moveAt(r, c);
    setFocused(mv);
    cells.current.get(mv)?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const [row, col] = globalRowCol(focused);
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
        moveFocus(row, col + 1);
        break;
      case 'ArrowLeft':
        moveFocus(row, col - 1);
        break;
      case 'ArrowDown':
        moveFocus(row + 1, col);
        break;
      case 'ArrowUp':
        moveFocus(row - 1, col);
        break;
      case 'Home':
        moveFocus(0, 0);
        break;
      case 'End':
        moveFocus(8, 8);
        break;
      default: {
        // 1–9 jump within the focused small board (reading order).
        const digit = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
        if (digit >= 0) {
          const mv = toMove(boardOf(focused), digit);
          setFocused(mv);
          cells.current.get(mv)?.focus();
          if (interactive) onPlay(mv);
        } else {
          handled = false;
        }
      }
    }
    if (handled) e.preventDefault();
  };

  const shakeName = invalid ? (invalid.nonce % 2 ? 'board-shake-a' : 'board-shake-b') : undefined;
  const line = game.winningLine;
  const [r1, c1] = line ? [Math.floor(line[0]! / 3), line[0]! % 3] : [0, 0];
  const [r2, c2] = line ? [Math.floor(line[2]! / 3), line[2]! % 3] : [0, 0];

  return (
    <div
      className={`ultimate${game.status !== 'playing' ? ' ultimate--over' : ''}`}
      role="group"
      aria-label={t('board.label', { name, size: 9 })}
      style={{ animationName: shakeName }}
      onKeyDown={onKeyDown}
      data-testid="board"
    >
      {game.boards.map((small, b) => {
        const result = game.results[b]!;
        const playable =
          game.status === 'playing' &&
          result === null &&
          (game.activeBoard === null || game.activeBoard === b);
        const inLine = line?.includes(b) ?? false;
        const cls = [
          'ultimate__board',
          playable ? 'ultimate__board--active' : '',
          result === 'X' || result === 'O' ? `ultimate__board--${result.toLowerCase()}` : '',
          result === 'D' ? 'ultimate__board--draw' : '',
          inLine ? 'ultimate__board--win' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={b}
            className={cls}
            role="group"
            aria-label={t('ultimate.board', { n: b + 1 })}
            data-board={b}
            data-active={playable || undefined}
          >
            {small.map((cell, c) => {
              const mv = toMove(b, c);
              const [row, col] = globalRowCol(mv);
              const cellCls = [
                'cell',
                cell ? `cell--${cell.toLowerCase()}` : 'cell--empty',
                mv === lastMove ? 'cell--last' : '',
                mv === hint ? 'cell--hint' : '',
                annotations?.get(mv) ?? '',
              ]
                .filter(Boolean)
                .join(' ');
              const label = `${t('ultimate.cell', { board: b + 1, row: (row % 3) + 1, col: (col % 3) + 1 })}, ${
                cell ? t('board.cell.mark', { mark: cell }) : t('board.cell.empty')
              }`;
              const disabled = !interactive || !playable || cell !== null;
              return (
                <button
                  key={`${gameId}-${mv}`}
                  ref={(el) => {
                    if (el) cells.current.set(mv, el);
                    else cells.current.delete(mv);
                  }}
                  type="button"
                  className={cellCls}
                  tabIndex={mv === focused ? 0 : -1}
                  aria-label={label}
                  aria-disabled={disabled || undefined}
                  data-index={mv}
                  data-mark={cell ?? ''}
                  onFocus={() => setFocused(mv)}
                  onClick={() => {
                    if (interactive) onPlay(mv);
                  }}
                >
                  {cell && <Mark player={cell} animate={mv === lastMove} />}
                </button>
              );
            })}
            {(result === 'X' || result === 'O') && (
              <div className="ultimate__result" aria-hidden="true">
                <Mark player={result} animate />
              </div>
            )}
          </div>
        );
      })}
      {line && (
        <svg
          className="board__line"
          viewBox="0 0 3 3"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <line x1={c1 + 0.5} y1={r1 + 0.5} x2={c2 + 0.5} y2={r2 + 0.5} />
        </svg>
      )}
    </div>
  );
}
