import type { Player } from '../engine/index.ts';

interface Props {
  player: Player;
  /** Animate the stroke drawing in (set on freshly placed marks). */
  animate?: boolean;
}

/**
 * An X or O drawn as SVG strokes so it can animate in and scale crisply
 * from a 360px phone to a 4K monitor.
 */
export function Mark({ player, animate = false }: Props) {
  const cls = `mark mark--${player.toLowerCase()}${animate ? ' mark--enter' : ''}`;
  if (player === 'X') {
    return (
      <svg className={cls} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <line className="mark__stroke mark__stroke--1" x1="22" y1="22" x2="78" y2="78" />
        <line className="mark__stroke mark__stroke--2" x1="78" y1="22" x2="22" y2="78" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle className="mark__stroke mark__stroke--o" cx="50" cy="50" r="30" />
    </svg>
  );
}
