import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { toRowCol, type GameState } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { Mark } from './Mark.tsx';

export interface BoardProps {
  game: GameState;
  /** Label for assistive tech, e.g. the variant name. */
  name: string;
  /** Whether clicks/keys should be dispatched at all. */
  interactive: boolean;
  onPlay: (index: number) => void;
  /** Last rejected move (drives the shake). */
  invalid: { index: number; nonce: number } | null;
  /** Cell to pulse as a suggestion. */
  hint?: number | null;
  /** Per-cell annotation classes (analysis view), keyed by cell index. */
  annotations?: ReadonlyMap<number, string>;
  /** Small text badges shown in empty cells (explorer view). */
  overlays?: ReadonlyMap<number, { text: string; cls: string }>;
  /** Bumps on new game so entrance animations reset. */
  gameId: number;
}

export function Board({
  game,
  name,
  interactive,
  onPlay,
  invalid,
  hint = null,
  annotations,
  overlays,
  gameId,
}: BoardProps) {
  const t = useT();
  const { size } = game.rules;
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(0);
  const lastMove = game.moves.length > 0 ? game.moves[game.moves.length - 1]! : -1;

  // Reset the roving tabindex when the board resets (state adjusted during render).
  const resetKey = `${gameId}:${size}`;
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setFocused(0);
  }

  const moveFocus = useCallback(
    (next: number) => {
      const clamped = ((next % (size * size)) + size * size) % (size * size);
      setFocused(clamped);
      cells.current[clamped]?.focus();
    },
    [size],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const [row, col] = toRowCol(focused, size);
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
        moveFocus(row * size + ((col + 1) % size));
        break;
      case 'ArrowLeft':
        moveFocus(row * size + ((col - 1 + size) % size));
        break;
      case 'ArrowDown':
        moveFocus(((row + 1) % size) * size + col);
        break;
      case 'ArrowUp':
        moveFocus(((row - 1 + size) % size) * size + col);
        break;
      case 'Home':
        moveFocus(0);
        break;
      case 'End':
        moveFocus(size * size - 1);
        break;
      default: {
        // 1–9 pick a cell in reading order on any board with at least that many cells.
        const digit = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
        if (digit >= 0 && digit < size * size) {
          moveFocus(digit);
          if (interactive) onPlay(digit);
        } else {
          handled = false;
        }
      }
    }
    if (handled) e.preventDefault();
  };

  const style = { '--size': size } as CSSProperties;
  const shakeName = invalid ? (invalid.nonce % 2 ? 'board-shake-a' : 'board-shake-b') : undefined;
  const line = game.winningLine;
  const [r1, c1] = line ? toRowCol(line[0]!, size) : [0, 0];
  const [r2, c2] = line ? toRowCol(line[line.length - 1]!, size) : [0, 0];

  return (
    <div
      className={`board${game.status !== 'playing' ? ' board--over' : ''}`}
      role="group"
      aria-label={t('board.label', { name, size })}
      style={{ ...style, animationName: shakeName }}
      onKeyDown={onKeyDown}
      data-testid="board"
    >
      {game.board.map((cell, i) => {
        const [row, col] = toRowCol(i, size);
        const inLine = line?.includes(i) ?? false;
        const overlay = cell === null ? overlays?.get(i) : undefined;
        const cls = [
          'cell',
          cell ? `cell--${cell.toLowerCase()}` : 'cell--empty',
          inLine ? 'cell--win' : '',
          i === lastMove ? 'cell--last' : '',
          i === hint ? 'cell--hint' : '',
          annotations?.get(i) ?? '',
          overlay?.cls ?? '',
        ]
          .filter(Boolean)
          .join(' ');
        const label = `${t('board.cell', { row: row + 1, col: col + 1 })}, ${
          cell ? t('board.cell.mark', { mark: cell }) : t('board.cell.empty')
        }${overlay ? `, ${overlay.text}` : ''}`;
        return (
          <button
            key={`${gameId}-${i}`}
            ref={(el) => {
              cells.current[i] = el;
            }}
            type="button"
            className={cls}
            tabIndex={i === focused ? 0 : -1}
            aria-label={label}
            aria-disabled={!interactive || cell !== null || undefined}
            data-index={i}
            data-mark={cell ?? ''}
            onFocus={() => setFocused(i)}
            onClick={() => {
              if (interactive) onPlay(i);
            }}
          >
            {cell && <Mark player={cell} animate={i === lastMove} />}
            {overlay && (
              <span className="cell__overlay" aria-hidden="true">
                {overlay.text}
              </span>
            )}
          </button>
        );
      })}
      {line && (
        <svg
          className="board__line"
          viewBox={`0 0 ${size} ${size}`}
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
