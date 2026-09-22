import { useMemo, useState } from 'react';
import {
  applyMove,
  dailySeed,
  generatePuzzle,
  isLegalMove,
  isSolution,
  replay,
  rulesFor,
  type Puzzle,
} from '../engine/index.ts';
import { useAnnouncer } from '../hooks/useAnnouncer.ts';
import { usePersistedState } from '../hooks/usePersistedState.ts';
import { useT } from '../i18n/index.ts';
import { playSound } from '../lib/sound.ts';
import { EMPTY_DAILY, parseDaily, recordSolve, solvedToday } from '../state/daily.ts';
import { Board } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { LiveAnnouncer } from './LiveAnnouncer.tsx';

const CONFETTI_COLORS = ['#38bdf8', '#fb7185', '#fbbf24', '#34d399', '#a78bfa'];

interface Attempt {
  puzzleSeed: number;
  wrong: number;
  solved: boolean;
  invalid: { index: number; nonce: number } | null;
}

/** "Find the winning move" — the puzzle of the day, plus unlimited practice puzzles. */
export function PuzzleScreen({ onBack }: { onBack: () => void }) {
  const t = useT();
  const today = useMemo(() => new Date(), []);
  const [progress, setProgress] = usePersistedState('daily', EMPTY_DAILY, parseDaily);
  const [seed, setSeed] = useState(() => dailySeed(today));
  const isDaily = seed === dailySeed(today);
  const puzzle: Puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const base = useMemo(() => replay(rulesFor(puzzle.variant), puzzle.moves), [puzzle]);
  const [attempt, setAttempt] = useState<Attempt>({
    puzzleSeed: seed,
    wrong: 0,
    solved: false,
    invalid: null,
  });
  const { announce, message, nonce } = useAnnouncer();

  // Reset the attempt when the puzzle changes (state adjusted during render).
  if (attempt.puzzleSeed !== seed) {
    setAttempt({ puzzleSeed: seed, wrong: 0, solved: false, invalid: null });
  }

  const alreadySolved = isDaily && solvedToday(progress, today);
  const shown = attempt.solved || alreadySolved;
  const game = shown ? applyMove(base, puzzle.solution) : base;
  const showHint = attempt.wrong >= 2 && !shown;

  const play = (index: number) => {
    if (shown || !isLegalMove(base, index)) return;
    if (isSolution(puzzle, index)) {
      setAttempt((a) => ({ ...a, solved: true, invalid: null }));
      if (isDaily) setProgress((p) => recordSolve(p, today));
      playSound('win');
      announce(t('puzzle.correct'));
    } else {
      setAttempt((a) => ({
        ...a,
        wrong: a.wrong + 1,
        invalid: { index, nonce: (a.invalid?.nonce ?? 0) + 1 },
      }));
      playSound('invalid');
      announce(t('puzzle.wrong'));
    }
  };

  const reveal = () => {
    setAttempt((a) => ({ ...a, solved: true, invalid: null }));
    announce(t('puzzle.revealed'));
  };

  const variantName = t(`variant.${puzzle.variant}`);
  const statusText = shown
    ? attempt.solved
      ? t('puzzle.correct')
      : t('puzzle.solvedToday')
    : t('puzzle.prompt', { player: puzzle.toMove });

  return (
    <div className="game puzzle" data-testid="puzzle">
      <LiveAnnouncer message={message} nonce={nonce} />
      <section className="game__main" aria-label={t('puzzle.title')}>
        <h2 className="puzzle__title">
          {isDaily ? t('puzzle.daily') : t('puzzle.practice')} · {variantName}
        </h2>
        <p className={`status${shown ? ' status--won' : ''}`} data-testid="puzzle-status">
          {statusText}
        </p>
        <p className="muted small">{t(`variant.${puzzle.variant}.rules`)}</p>
        <div className="board-wrap">
          <Board
            game={game}
            name={variantName}
            interactive={!shown}
            onPlay={play}
            invalid={attempt.invalid}
            hint={showHint ? puzzle.solution : null}
            gameId={seed}
          />
          <Confetti burst={attempt.solved ? seed : null} colors={CONFETTI_COLORS} />
        </div>
        <div className="controls">
          {!shown && attempt.wrong >= 3 && (
            <button type="button" className="btn btn--ghost" onClick={reveal} data-testid="reveal">
              {t('puzzle.reveal')}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
            data-testid="practice"
          >
            {t('puzzle.another')}
          </button>
          {!isDaily && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSeed(dailySeed(today))}
            >
              {t('puzzle.backToDaily')}
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onBack} data-testid="back">
            {t('puzzle.back')}
          </button>
        </div>
      </section>
      <aside className="game__side">
        <section className="panel" aria-labelledby="daily-stats">
          <h2 id="daily-stats">{t('puzzle.daily')}</h2>
          <dl className="stats">
            <div className="stat">
              <dt>{t('stats.streak')}</dt>
              <dd>{progress.streak}</dd>
            </div>
            <div className="stat">
              <dt>{t('stats.bestStreak')}</dt>
              <dd>{progress.best}</dd>
            </div>
            <div className="stat">
              <dt>{t('puzzle.solved')}</dt>
              <dd>{progress.solvedCount}</dd>
            </div>
          </dl>
          <p className="muted small">{t('puzzle.how')}</p>
        </section>
      </aside>
    </div>
  );
}
