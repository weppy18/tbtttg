import { useMemo, useState } from 'react';
import {
  bestMoves,
  evaluateMoves,
  outcomeOf,
  replay,
  rulesFor,
  toRowCol,
  type BoardVariantId,
  type Outcome,
} from '../engine/index.ts';
import { useT } from '../i18n/index.ts';
import { Board } from './Board.tsx';
import { Segmented } from './Segmented.tsx';

const EXPLORABLE: readonly BoardVariantId[] = ['classic', 'misere'];

/**
 * Opening-book explorer: browse the full 3×3 game tree. Every empty cell is
 * labelled with its theoretical outcome for the side to move (perfect play
 * from both sides), so you can see exactly why an opening is good or bad.
 */
export function ExplorerScreen({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [variant, setVariant] = useState<BoardVariantId>('classic');
  const [moves, setMoves] = useState<number[]>([]);
  const rules = rulesFor(variant);
  const game = useMemo(() => replay(rules, moves), [rules, moves]);
  const evals = useMemo(() => evaluateMoves(game), [game]);

  const counts = useMemo(() => {
    const c: Record<Outcome, number> = { win: 0, draw: 0, loss: 0 };
    for (const e of evals) c[outcomeOf(e.score)]++;
    return c;
  }, [evals]);

  const overlays = useMemo(() => {
    const map = new Map<number, { text: string; cls: string }>();
    for (const e of evals) {
      const o = outcomeOf(e.score);
      map.set(e.index, { text: t(`explorer.${o}.short`), cls: `cell--eval-${o}` });
    }
    return map;
  }, [evals, t]);

  const value =
    game.status === 'playing'
      ? outcomeOf(evals[0]!.score)
      : game.status === 'draw'
        ? 'draw'
        : game.winner === game.toMove
          ? 'win'
          : 'loss';

  const playBestLine = () => {
    let g = game;
    const line = [...moves];
    while (g.status === 'playing') {
      const best = bestMoves(g)[0]!;
      line.push(best);
      g = replay(rules, line);
    }
    setMoves(line);
  };

  const describe = (m: number) => {
    const [r, c] = toRowCol(m, rules.size);
    return `${String.fromCharCode(97 + c)}${r + 1}`;
  };

  return (
    <div className="game explorer" data-testid="explorer">
      <section className="game__main" aria-label={t('explorer.title')}>
        <h2 className="puzzle__title">{t('explorer.title')}</h2>
        <p className="status" data-testid="explorer-status">
          {game.status === 'playing'
            ? t('explorer.value', { player: game.toMove, outcome: t(`explorer.${value}`) })
            : game.status === 'draw'
              ? t('status.draw')
              : t('status.win', { player: game.winner ?? '' })}
        </p>
        {game.status === 'playing' && (
          <p className="muted small" data-testid="explorer-counts">
            {t('explorer.counts', { win: counts.win, draw: counts.draw, loss: counts.loss })}
          </p>
        )}
        <div className="board-wrap">
          <Board
            game={game}
            name={t(`variant.${variant}`)}
            interactive={game.status === 'playing'}
            onPlay={(i) => setMoves([...moves, i])}
            invalid={null}
            overlays={overlays}
            gameId={0}
          />
        </div>
        <nav className="crumbs" aria-label={t('history.title')} data-testid="crumbs">
          <button
            type="button"
            className={`history__item${moves.length === 0 ? ' history__item--active' : ''}`}
            onClick={() => setMoves([])}
          >
            {t('history.start')}
          </button>
          {moves.map((m, i) => (
            <button
              key={i}
              type="button"
              className={`history__item${i === moves.length - 1 ? ' history__item--active' : ''}`}
              onClick={() => setMoves(moves.slice(0, i + 1))}
            >
              <span className={`history__mark history__mark--${i % 2 === 0 ? 'x' : 'o'}`}>
                {i % 2 === 0 ? 'X' : 'O'}
              </span>
              {describe(m)}
            </button>
          ))}
        </nav>
        <div className="controls">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setMoves(moves.slice(0, -1))}
            disabled={moves.length === 0}
          >
            {t('action.undo')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={playBestLine}
            disabled={game.status !== 'playing'}
            data-testid="best-line"
          >
            {t('explorer.bestLine')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onBack} data-testid="back">
            {t('puzzle.back')}
          </button>
        </div>
      </section>
      <aside className="game__side">
        <div className="setup">
          <Segmented<BoardVariantId>
            label={t('variant.label')}
            value={variant}
            options={EXPLORABLE.map((v) => ({ value: v, label: t(`variant.${v}`) }))}
            onChange={(v) => {
              setVariant(v);
              setMoves([]);
            }}
          />
          <p className="setup__rules">{t('explorer.how')}</p>
          <dl className="legend">
            <div>
              <dt className="cell--eval-win">{t('explorer.win.short')}</dt>
              <dd>{t('explorer.win')}</dd>
            </div>
            <div>
              <dt className="cell--eval-draw">{t('explorer.draw.short')}</dt>
              <dd>{t('explorer.draw')}</dd>
            </div>
            <div>
              <dt className="cell--eval-loss">{t('explorer.loss.short')}</dt>
              <dd>{t('explorer.loss')}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
