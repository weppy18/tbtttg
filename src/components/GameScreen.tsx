import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  globalRowCol,
  other,
  replayVariant,
  toRowCol,
  type AnyGame,
  type MoveQuality,
} from '../engine/index.ts';
import { useAnalysis } from '../hooks/useAnalysis.ts';
import { useAnnouncer } from '../hooks/useAnnouncer.ts';
import { useMatch, type MatchApi } from '../hooks/useMatch.ts';
import { usePersistedState } from '../hooks/usePersistedState.ts';
import { useT } from '../i18n/index.ts';
import { shareUrl } from '../lib/share.ts';
import { playSound } from '../lib/sound.ts';
import { useReplay } from '../hooks/useReplay.ts';
import { isAiSide, type MatchConfig } from '../state/match.ts';
import { parseStats, recordGame, type Stats } from '../state/stats.ts';
import { AnalysisPanel } from './AnalysisPanel.tsx';
import { Board } from './Board.tsx';
import { UltimateBoard } from './UltimateBoard.tsx';
import type { MoveDescription } from './MoveHistory.tsx';
import { Confetti } from './Confetti.tsx';
import { LiveAnnouncer } from './LiveAnnouncer.tsx';
import { MoveHistory } from './MoveHistory.tsx';
import { Scoreboard } from './Scoreboard.tsx';
import { SetupPanel } from './SetupPanel.tsx';
import { PlayersPanel } from './PlayersPanel.tsx';
import { SwapContext, useEffectiveProfile } from '../state/swapContext.ts';
import { SeriesPanel } from './SeriesPanel.tsx';
import { TurnShield } from './TurnShield.tsx';
import { useSettings } from '../state/settingsContext.ts';
import { seatOf, seriesWinner, type MatchState } from '../state/match.ts';
import type { Player } from '../engine/index.ts';

const CONFETTI_COLORS = ['#38bdf8', '#fb7185', '#fbbf24', '#34d399', '#a78bfa'];

const QUALITY_SYMBOL: Record<MoveQuality, string> = {
  best: '',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/** 1-based coordinates of a move: board cells directly, Ultimate on the 9x9 grid. */
function describeMove(game: AnyGame, move: number): MoveDescription {
  if (game.kind === 'board') {
    const [r, c] = toRowCol(move, game.rules.size);
    return { short: `${String.fromCharCode(97 + c)}${r + 1}`, row: r + 1, col: c + 1 };
  }
  const [r, c] = globalRowCol(move);
  return { short: `${String.fromCharCode(97 + c)}${r + 1}`, row: r + 1, col: c + 1 };
}

/** Display name for a side: the profile name, "AI" for AI sides, else the letter. */
function useNames(config: MatchConfig): (player: Player) => string {
  const t = useT();
  const profile = useEffectiveProfile();
  return useCallback(
    (player: Player) => {
      if (isAiSide(config, player)) {
        return config.mode === 'ava' ? `${t('players.ai')} ${player}` : t('players.ai');
      }
      return profile(player).name || player;
    },
    [config, profile, t],
  );
}

/** Series-level status once a best-of-N is decided. */
function useSeriesStatus(match: MatchState, name: (p: Player) => string): string | null {
  const t = useT();
  if (!match.series) return null;
  const winner = seriesWinner(match.series);
  if (!winner) return null;
  const player: Player = seatOf(match, 'X') === winner ? 'X' : 'O';
  const { wins } = match.series;
  return t('series.won', {
    player: name(player),
    a: wins[winner],
    b: wins[winner === 'A' ? 'B' : 'A'],
  });
}

function useStatus(config: MatchConfig, game: AnyGame, aiThinking: boolean): string {
  const t = useT();
  const name = useNames(config);
  if (game.status === 'draw') return t('status.draw');
  if (game.status === 'won' && game.winner) {
    if (config.mode === 'hva') {
      return game.winner === config.humanSide ? t('status.youWin') : t('status.youLose');
    }
    if (game.kind === 'board' && game.rules.misere) {
      return t('status.misereWin', { loser: name(other(game.winner)), player: name(game.winner) });
    }
    return t('status.win', { player: name(game.winner) });
  }
  if (aiThinking) return t('status.aiThinking');
  if (config.mode === 'hva' && game.toMove === config.humanSide) {
    return t('status.yourTurn', { player: name(game.toMove) });
  }
  return t('status.toMove', { player: name(game.toMove) });
}

export function GameScreen() {
  const [stats, setStats] = usePersistedState<Stats>('stats', {}, parseStats);
  const onGameOver = useCallback(
    (config: MatchConfig, game: AnyGame) => setStats((s) => recordGame(s, config, game)),
    [setStats],
  );
  const m = useMatch(onGameOver);
  return (
    <SwapContext.Provider value={m.swapped}>
      <GameScreenInner m={m} stats={stats} resetStats={() => setStats({})} />
    </SwapContext.Provider>
  );
}

function GameScreenInner({
  m,
  stats,
  resetStats,
}: {
  m: MatchApi;
  stats: Stats;
  resetStats: () => void;
}) {
  const t = useT();
  const { match, game, undo, redo, newGame } = m;
  const { announce, message, nonce } = useAnnouncer();
  const name = useNames(match.config);
  const { settings, update } = useSettings();
  // Hot seat: after each two-player move, hide the board until the next player is ready.
  const hotSeat = settings.hotSeat && match.config.mode === 'hvh';
  const [shieldKey, setShieldKey] = useState<string | null>(null);
  const positionKey = `${match.gameId}:${match.cursor}`;
  const shieldOpen =
    hotSeat && game.status === 'playing' && match.cursor > 0 && shieldKey !== positionKey;
  const gameStatus = useStatus(match.config, game, m.aiThinking);
  const seriesStatus = useSeriesStatus(match, name);
  const status = seriesStatus ?? gameStatus;
  const seriesOver = seriesStatus !== null;
  const { hint, requestHint, analysis, analysing, analyse } = useAnalysis(
    match.config.variant,
    match.gameId,
    match.moves,
    match.cursor,
  );

  // Announce every move and result for screen readers, and play the matching sound.
  const seenRef = useRef<{ gameId: number; cursor: number }>({ gameId: -1, cursor: -1 });
  useEffect(() => {
    const prev = seenRef.current;
    if (prev.gameId === match.gameId && prev.cursor === match.cursor) return;
    const firstRender = prev.gameId === -1;
    seenRef.current = { gameId: match.gameId, cursor: match.cursor };
    if (firstRender) return;
    const sameGame = prev.gameId === match.gameId;
    if (match.cursor === 0) {
      if (!sameGame) announce(t('announce.newGame', { player: 'X' }));
      else if (prev.cursor > 0) {
        announce(t('announce.undo'));
        playSound('undo');
      }
      return;
    }
    if (sameGame && match.cursor < prev.cursor) {
      announce(t('announce.undo'));
      playSound('undo');
      return;
    }
    const last = match.moves[match.cursor - 1]!;
    const { row, col } = describeMove(game, last);
    const mover = other(game.toMove);
    const ai = isAiSide(match.config, mover);
    let text = t(ai ? 'announce.aiMove' : 'announce.move', { player: name(mover), row, col });
    if (game.kind === 'ultimate' && game.status === 'playing') {
      text +=
        ' ' +
        (game.activeBoard === null
          ? t('ultimate.free')
          : t('ultimate.sentTo', { n: game.activeBoard + 1 }));
    }
    if (game.status === 'won' && game.winner) {
      text += ' ' + t('announce.win', { player: name(game.winner) });
      const humanLost = match.config.mode === 'hva' && game.winner !== match.config.humanSide;
      playSound(humanLost ? 'lose' : 'win');
    } else if (game.status === 'draw') {
      text += ' ' + t('announce.draw');
      playSound('draw');
    } else {
      playSound(mover === 'X' ? 'place-x' : 'place-o');
    }
    announce(text);
  }, [match.gameId, match.cursor, match.moves, match.config, game, announce, t, name]);

  useEffect(() => {
    if (match.invalid) playSound('invalid');
  }, [match.invalid]);

  // Confetti when a human wins (or anyone wins in two-player mode). Derived from
  // the live end of the move list so browsing history never re-fires it.
  const finalGame = useMemo(
    () => replayVariant(match.config.variant, match.moves),
    [match.config.variant, match.moves],
  );
  const humanWon =
    finalGame.status === 'won' &&
    (match.config.mode === 'hvh' ||
      (match.config.mode === 'hva' && finalGame.winner === match.config.humanSide));
  const burst = humanWon ? match.gameId * 100 + match.moves.length : null;

  // Global shortcuts: U undo, R redo, N new game, H hint.
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
      const k = e.key.toLowerCase();
      if (k === 'u') undo();
      else if (k === 'r') redo();
      else if (k === 'n') newGame();
      else if (k === 'h' && m.humanTurn) requestHint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, newGame, requestHint, m.humanTurn]);

  const invalid = useMemo(
    () => (match.invalid ? { index: match.invalid.index, nonce: match.invalid.nonce } : null),
    [match.invalid],
  );

  // Analysis annotations for the board (at the current cursor) and the move list.
  const boardNotes = useMemo(() => {
    const map = new Map<number, string>();
    if (!analysis || match.cursor === 0) return map;
    const report = analysis.moves[match.cursor - 1];
    if (!report) return map;
    map.set(report.index, `cell--${report.quality}`);
    if (report.quality !== 'best') for (const b of report.bestMoves) map.set(b, 'cell--best');
    return map;
  }, [analysis, match.cursor]);
  const historyNotes = useMemo(() => {
    const map = new Map<number, { cls: string; label: string }>();
    if (!analysis) return map;
    analysis.moves.forEach((r) => {
      if (r.quality !== 'best' && r.quality !== 'good') {
        map.set(r.ply, { cls: `cell--${r.quality}`, label: QUALITY_SYMBOL[r.quality] });
      }
    });
    return map;
  }, [analysis]);

  const variantName = t(`variant.${match.config.variant}`);
  const over = game.status !== 'playing';
  const finished = finalGame.status !== 'playing';
  const profile = useEffectiveProfile();
  const colours = {
    ...(profile('X').color ? { '--x': profile('X').color } : {}),
    ...(profile('O').color ? { '--o': profile('O').color } : {}),
  } as CSSProperties;

  const replayer = useReplay(match.gameId, match.moves.length, m.jump);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const share = async () => {
    const url = shareUrl({ variant: match.config.variant, moves: match.moves }, location.href);
    try {
      if (navigator.share) {
        await navigator.share({ title: t('appTitle'), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      announce(t('action.copied'));
    } catch {
      // user dismissed the share sheet or clipboard is blocked — nothing to do
    }
  };

  return (
    <div className="game" style={colours}>
      <LiveAnnouncer message={message} nonce={nonce} />
      <section className="game__main" aria-label={variantName}>
        <p className={`status status--${game.status}`} data-testid="status">
          {status}
        </p>
        {game.kind === 'ultimate' && game.status === 'playing' && (
          <p className="muted small" data-testid="ultimate-hint">
            {game.activeBoard === null
              ? t('ultimate.free')
              : t('ultimate.sentTo', { n: game.activeBoard + 1 })}
          </p>
        )}
        <div className={`board-wrap${shieldOpen ? ' board-wrap--hidden' : ''}`}>
          {shieldOpen && (
            <TurnShield
              playerName={name(game.toMove)}
              onContinue={() => setShieldKey(positionKey)}
            />
          )}
          {game.kind === 'board' ? (
            <Board
              game={game}
              name={variantName}
              interactive={m.humanTurn}
              onPlay={m.play}
              invalid={invalid}
              hint={hint}
              annotations={boardNotes}
              gameId={match.gameId}
            />
          ) : (
            <UltimateBoard
              game={game}
              name={variantName}
              interactive={m.humanTurn}
              onPlay={m.play}
              invalid={invalid}
              hint={hint}
              annotations={boardNotes}
              gameId={match.gameId}
            />
          )}
          <Confetti burst={burst} colors={CONFETTI_COLORS} />
        </div>
        <div className="controls" role="toolbar" aria-label={t('action.settings')}>
          {seriesOver ? (
            <button
              type="button"
              className="btn"
              onClick={() => m.startSeries(match.series!.bestOf)}
              data-testid="new-game"
            >
              {t('series.again')}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => m.newGame()}
              data-testid="new-game"
            >
              {over
                ? match.series
                  ? t('series.nextGame')
                  : t('action.playAgain')
                : t('action.newGame')}
            </button>
          )}
          {over && match.config.mode === 'hva' && !match.series && (
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
          {!over && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={requestHint}
              disabled={!m.humanTurn}
              aria-pressed={hint !== null}
              data-testid="hint"
            >
              {t('action.hint')}
            </button>
          )}
          {finished && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={replayer.replaying ? replayer.stop : replayer.start}
              data-testid="replay"
            >
              {replayer.replaying ? t('action.stopReplay') : t('action.replay')}
            </button>
          )}
          {finished && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void share()}
              data-testid="share"
            >
              {copied ? t('action.copied') : t('action.share')}
            </button>
          )}
          {finished && !analysis && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={analyse}
              disabled={analysing}
              data-testid="analyse"
            >
              {analysing ? t('analysis.running') : t('action.analyse')}
            </button>
          )}
        </div>
        {analysis && <AnalysisPanel analysis={analysis} />}
        <p className="muted small">{t('keyboard.help')}</p>
      </section>
      <aside className="game__side">
        <SetupPanel
          config={match.config}
          onChange={(patch) => m.newGame(patch)}
          hotSeat={settings.hotSeat}
          onHotSeat={(hotSeat) => update({ hotSeat })}
        />
        <SeriesPanel match={match} name={name} onStart={m.startSeries} onEnd={m.endSeries} />
        <Scoreboard stats={stats} config={match.config} onReset={resetStats} />
        <SwapContext.Provider value={false}>
          <PlayersPanel />
        </SwapContext.Provider>
        <MoveHistory
          moves={match.moves}
          cursor={match.cursor}
          describe={(mv) => describeMove(game, mv)}
          onJump={m.jump}
          annotations={historyNotes}
        />
      </aside>
    </div>
  );
}
