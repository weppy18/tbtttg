import { useT } from '../i18n/index.ts';
import type { MatchConfig } from '../state/match.ts';
import { EMPTY_TALLY, games, statsKey, type Stats } from '../state/stats.ts';

interface Props {
  stats: Stats;
  config: MatchConfig;
  onReset: () => void;
}

/** Tally for the current mode/variant/difficulty bucket. */
export function Scoreboard({ stats, config, onReset }: Props) {
  const t = useT();
  const tally = stats[statsKey(config)] ?? EMPTY_TALLY;
  const total = games(tally);
  const human = config.mode === 'hva' ? config.humanSide : null;

  const rows =
    human !== null
      ? [
          { label: t('stats.wins'), value: human === 'X' ? tally.x : tally.o, cls: 'stat--win' },
          { label: t('stats.losses'), value: human === 'X' ? tally.o : tally.x, cls: 'stat--loss' },
          { label: t('stats.draws'), value: tally.draws, cls: 'stat--draw' },
        ]
      : [
          { label: t('stats.x'), value: tally.x, cls: 'stat--x' },
          { label: t('stats.o'), value: tally.o, cls: 'stat--o' },
          { label: t('stats.draws'), value: tally.draws, cls: 'stat--draw' },
        ];

  const streakPlayer = tally.streakPlayer;
  const streakLabel =
    streakPlayer === null
      ? '—'
      : human !== null
        ? `${tally.streak}`
        : `${streakPlayer} · ${tally.streak}`;
  const best =
    human !== null ? tally.bestStreak[human] : Math.max(tally.bestStreak.X, tally.bestStreak.O);

  return (
    <section
      className="panel scoreboard"
      aria-labelledby="scoreboard-title"
      data-testid="scoreboard"
    >
      <div className="panel__head">
        <h2 id="scoreboard-title">{t('stats.title')}</h2>
        {total > 0 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={onReset}>
            {t('action.resetStats')}
          </button>
        )}
      </div>
      {total === 0 ? (
        <p className="muted">{t('stats.empty')}</p>
      ) : (
        <dl className="stats">
          {rows.map((r) => (
            <div key={r.label} className={`stat ${r.cls}`}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
          <div className="stat">
            <dt>{t('stats.streak')}</dt>
            <dd>{human !== null && streakPlayer !== human ? '0' : streakLabel}</dd>
          </div>
          <div className="stat">
            <dt>{t('stats.bestStreak')}</dt>
            <dd>{best}</dd>
          </div>
          <div className="stat">
            <dt>{t('stats.games')}</dt>
            <dd>{total}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
