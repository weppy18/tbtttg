import { memo } from 'react';
import type { Player } from '../engine/index.ts';
import { isStrokeMark } from '../state/profiles.ts';
import { useProfiles } from '../state/profilesContext.ts';

interface Props {
  player: Player;
  /** Animate the stroke drawing in (set on freshly placed marks). */
  animate?: boolean;
}

/**
 * A player's mark: X/O drawn as SVG strokes so they animate in and scale
 * crisply, or the player's chosen glyph (emoji/text) rendered as text.
 */
export const Mark = memo(function Mark({ player, animate = false }: Props) {
  const { profiles } = useProfiles();
  const glyph = profiles[player].mark;
  const cls = `mark mark--${player.toLowerCase()}${animate ? ' mark--enter' : ''}`;
  if (!isStrokeMark(glyph)) {
    return (
      <span className={`${cls} mark--glyph`} aria-hidden="true">
        {glyph}
      </span>
    );
  }
  if (glyph === 'X') {
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
});
