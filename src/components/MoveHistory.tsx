import { useT } from '../i18n/index.ts';

export interface MoveDescription {
  /** Short algebraic-style label, e.g. "b2" or "5/b2". */
  readonly short: string;
  /** 1-based row/column for the accessible label. */
  readonly row: number;
  readonly col: number;
}

interface Props {
  moves: readonly number[];
  cursor: number;
  describe: (move: number) => MoveDescription;
  onJump: (cursor: number) => void;
  /** Optional per-move annotation (analysis): class name and short label. */
  annotations?: ReadonlyMap<number, { cls: string; label: string }>;
}

/** Clickable move list. The active position is the one at `cursor`. */
export function MoveHistory({ moves, cursor, describe, onJump, annotations }: Props) {
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
          const { short, row, col } = describe(m);
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
                aria-label={t('history.move', { n, player, row, col })}
                onClick={() => onJump(n)}
              >
                <span className="history__n">{n}.</span>
                <span className={`history__mark history__mark--${player.toLowerCase()}`}>
                  {player}
                </span>
                <span className="history__pos">{short}</span>
                {note && <span className="history__note">{note.label}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
