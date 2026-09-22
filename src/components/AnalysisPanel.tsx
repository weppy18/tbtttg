import type { GameAnalysis, MoveQuality, Player } from '../engine/index.ts';
import { useT } from '../i18n/index.ts';

const ORDER: readonly MoveQuality[] = ['blunder', 'mistake', 'inaccuracy', 'good', 'best'];

/** Per-player move-quality summary shown after "Analyse game". */
export function AnalysisPanel({ analysis }: { analysis: GameAnalysis }) {
  const t = useT();
  const line = (player: Player) => {
    const counts = analysis.summary[player];
    const parts = ORDER.filter((q) => counts[q] > 0 && q !== 'best' && q !== 'good').map(
      (q) => `${counts[q]} ${t(`analysis.${q}`).toLowerCase()}`,
    );
    return t('analysis.playerSummary', {
      player,
      summary: parts.length === 0 ? t('analysis.perfect') : parts.join(', '),
    });
  };
  return (
    <section className="analysis" aria-label={t('analysis.title')} data-testid="analysis">
      <p className="analysis__line">{line('X')}</p>
      <p className="analysis__line">{line('O')}</p>
      <p className="muted small">{t('analysis.legend')}</p>
    </section>
  );
}
