import type { Player } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import {
  SERIES_LENGTHS,
  seatOf,
  seriesWinner,
  winsNeeded,
  type MatchState,
} from '../state/match.ts';

interface Props {
  match: MatchState;
  name: (player: Player) => string;
  onStart: (bestOf: number) => void;
  onEnd: () => void;
}

/** Best-of-N series controls and score. Seat A is whoever played X in game 1. */
export function SeriesPanel({ match, name, onStart, onEnd }: Props) {
  const t = useT();
  const { series } = match;
  if (!series) {
    return (
      <section className="panel series" aria-labelledby="series-title" data-testid="series">
        <div className="panel__head">
          <h2 id="series-title">{t('series.title')}</h2>
        </div>
        <div className="controls controls--start">
          {SERIES_LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onStart(n)}
              data-testid={`series-${n}`}
            >
              {t('series.bestOf', { n })}
            </button>
          ))}
        </div>
      </section>
    );
  }
  const aPlayer: Player = seatOf(match, 'X') === 'A' ? 'X' : 'O';
  const bPlayer: Player = aPlayer === 'X' ? 'O' : 'X';
  const winner = seriesWinner(series);
  return (
    <section className="panel series" aria-labelledby="series-title" data-testid="series">
      <div className="panel__head">
        <h2 id="series-title">
          {t('series.bestOf', { n: series.bestOf })} · {t('series.game', { n: series.game + 1 })}
        </h2>
        <button type="button" className="btn btn--ghost btn--small" onClick={onEnd}>
          {t('series.end')}
        </button>
      </div>
      <p className="series__score" data-testid="series-score">
        <span className={`series__name history__mark--${aPlayer.toLowerCase()}`}>
          {name(aPlayer)}
        </span>
        <span className="series__num">
          {series.wins.A} – {series.wins.B}
        </span>
        <span className={`series__name history__mark--${bPlayer.toLowerCase()}`}>
          {name(bPlayer)}
        </span>
      </p>
      <p className="muted small">
        {winner
          ? t('series.finished')
          : t('series.firstTo', { n: winsNeeded(series.bestOf), draws: series.draws })}
      </p>
    </section>
  );
}
