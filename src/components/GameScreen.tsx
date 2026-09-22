import { useCallback, useEffect, useMemo, useRef } from 'react';
import { other, replay, rulesFor, toRowCol, type GameState } from '../engine/index.ts';
import { useAnnouncer } from '../hooks/useAnnouncer.ts';
import { useMatch } from '../hooks/useMatch.ts';
import { usePersistedState } from '../hooks/usePersistedState.ts';
import { useT } from '../i18n/index.ts';
import { isAiSide, type MatchConfig } from '../state/match.ts';
import { parseStats, recordGame, type Stats } from '../state/stats.ts';
import { Board } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { LiveAnnouncer } from './LiveAnnouncer.tsx';
import { MoveHistory } from './MoveHistory.tsx';
import { Scoreboard } from './Scoreboard.tsx';
import { SetupPanel } from './SetupPanel.tsx';

const CONFETTI_COLORS = ['#38bdf8', '#fb7185', '#fbbf24', '#34d399', '#a78bfa'];

function useStatus(config: MatchConfig, game: GameState, aiThinking: boolean): string {
  const t = useT();
  if (game.status === 'draw') return t('status.draw');
  if (game.status === 'won' && game.winner) {
    if (config.mode === 'hva') {
      return game.winner === config.humanSide ? t('status.youWin') : t('status.youLose');
    }
    if (game.rules.misere) {
      return t('status.misereWin', { loser: other(game.winner), player: game.winner });
    }
    return t('status.win', { player: game.winner });
  }
  if (aiThinking) return t('status.aiThinking');
  if (config.mode === 'hva' && game.toMove === config.humanSide) {
    return t('status.yourTurn', { player: game.toMove });
  }
  return t('status.toMove', { player: game.toMove });
}

export function GameScreen() {
  const t = useT();
  const [stats, setStats] = usePersistedState<Stats>('stats', {}, parseStats);
  const onGameOver = useCallback(
    (config: MatchConfig, game: GameState) => setStats((s) => recordGame(s, config, game)),
    [setStats],
  );
  const m = useMatch(onGameOver);
  const { match, game, undo, redo, newGame } = m;
  const { announce, message, nonce } = useAnnouncer();
  const status = useStatus(match.config, game, m.aiThinking);

  // Announce every move and result for screen readers.
  const announcedRef = useRef<{ gameId: number; cursor: number }>({ gameId: -1, cursor: -1 });
  useEffect(() => {
    const prev = announcedRef.current;
    if (prev.gameId === match.gameId && prev.cursor === match.cursor) return;
    announcedRef.current = { gameId: match.gameId, cursor: match.cursor };
    if (match.cursor === 0) {
      if (prev.gameId !== match.gameId) announce(t('announce.newGame', { player: 'X' }));
      else if (prev.cursor > 0) announce(t('announce.undo'));
      return;
    }
    const last = match.moves[match.cursor - 1]!;
    const [row, col] = toRowCol(last, game.rules.size);
    const mover = other(game.toMove);
    const ai = isAiSide(match.config, mover);
    let text = t(ai ? 'announce.aiMove' : 'announce.move', {
      player: mover,
      row: row + 1,
      col: col + 1,
    });
    if (game.status === 'won' && game.winner)
      text += ' ' + t('announce.win', { player: game.winner });
    if (game.status === 'draw') text += ' ' + t('announce.draw');
    announce(text);
  }, [match.gameId, match.cursor, match.moves, match.config, game, announce, t]);

  // Confetti when a human wins (or anyone wins in two-player mode). Derived from
  // the live end of the move list so browsing history never re-fires it.
  const finalGame = useMemo(
    () => replay(rulesFor(match.config.variant), match.moves),
    [match.config.variant, match.moves],
  );
  const humanWon =
    finalGame.status === 'won' &&
    (match.config.mode === 'hvh' ||
      (match.config.mode === 'hva' && finalGame.winner === match.config.humanSide));
  const burst = humanWon ? match.gameId * 100 + match.moves.length : null;

  // Global shortcuts: U undo, R redo, N new game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) &&
        target.getAttribute('type') !== 'radio'
      )
        return;
      if (e.key === 'u' || e.key === 'U') undo();
      else if (e.key === 'r' || e.key === 'R') redo();
      else if (e.key === 'n' || e.key === 'N') newGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, newGame]);

  const invalid = useMemo(
    () => (match.invalid ? { index: match.invalid.index, nonce: match.invalid.nonce } : null),
    [match.invalid],
  );
  const variantName = t(`variant.${match.config.variant}`);
  const over = game.status !== 'playing';

  return (
    <div className="game">
      <LiveAnnouncer message={message} nonce={nonce} />
      <section className="game__main" aria-label={variantName}>
        <p className={`status status--${game.status}`} data-testid="status">
          {status}
        </p>
        <div className="board-wrap">
          <Board
            game={game}
            name={variantName}
            interactive={m.humanTurn}
            onPlay={m.play}
            invalid={invalid}
            gameId={match.gameId}
          />
          <Confetti burst={burst} colors={CONFETTI_COLORS} />
        </div>
        <div className="controls" role="toolbar" aria-label={t('action.settings')}>
          <button type="button" className="btn" onClick={() => m.newGame()} data-testid="new-game">
            {over ? t('action.playAgain') : t('action.newGame')}
          </button>
          {over && match.config.mode === 'hva' && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => m.newGame({ humanSide: other(match.config.humanSide) })}
            >
              {t('action.rematch')}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={m.undo}
            disabled={!m.canUndo}
            data-testid="undo"
          >
            {t('action.undo')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={m.redo}
            disabled={!m.canRedo}
            data-testid="redo"
          >
            {t('action.redo')}
          </button>
        </div>
        <p className="muted small">{t('keyboard.help')}</p>
      </section>
      <aside className="game__side">
        <SetupPanel config={match.config} onChange={(patch) => m.newGame(patch)} />
        <Scoreboard stats={stats} config={match.config} onReset={() => setStats({})} />
        <MoveHistory
          moves={match.moves}
          cursor={match.cursor}
          size={game.rules.size}
          onJump={m.jump}
        />
      </aside>
    </div>
  );
}
