import { toRowCol } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';

interface Props {
  moves: readonly number[];
  cursor: number;
  size: number;
  onJump: (cursor: number) => void;
  /** Optional per-move annotation (analysis): class name and short label. */
  annotations?: ReadonlyMap<number, { cls: string; label: string }>;
}

/** Clickable move list. The active position is the one at `cursor`. */
export function MoveHistory({ moves, cursor, size, onJump, annotations }: Props) {
  const t = useT();
  if (moves.length === 0) return null;
  return (
    <section className="panel history" aria-labelledby="history-title" data-testid="history">
      <h2 id="history-title">{t('history.title')}</h2>
      <ol className="history__list">
        <li>
          <button
            type="button"
            className={`history__item${cursor === 0 ? ' history__item--active' : ''}`}
            aria-current={cursor === 0 ? 'step' : undefined}
            onClick={() => onJump(0)}
          >
            {t('history.start')}
          </button>
        </li>
        {moves.map((m, i) => {
          const [row, col] = toRowCol(m, size);
          const player = i % 2 === 0 ? 'X' : 'O';
          const n = i + 1;
          const active = cursor === n;
          const note = annotations?.get(i);
          return (
            <li key={i}>
              <button
                type="button"
                className={`history__item${active ? ' history__item--active' : ''} ${note?.cls ?? ''}`}
                aria-current={active ? 'step' : undefined}
                aria-label={t('history.move', { n, player, row: row + 1, col: col + 1 })}
                onClick={() => onJump(n)}
              >
                <span className="history__n">{n}.</span>
                <span className={`history__mark history__mark--${player.toLowerCase()}`}>
                  {player}
                </span>
                <span className="history__pos">
                  {String.fromCharCode(97 + col)}
                  {row + 1}
                </span>
                {note && <span className="history__note">{note.label}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
