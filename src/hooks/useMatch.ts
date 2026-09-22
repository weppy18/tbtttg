import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { GameState } from '../engine/index.ts';
import { requestMove } from '../lib/aiClient.ts';
import { SHARE_PARAM, readSharedGame } from '../lib/share.ts';
import { readJson, writeJson } from '../lib/storage.ts';
import {
  DEFAULT_CONFIG,
  canRedo,
  canUndo,
  currentGame,
  difficultyFor,
  initialMatch,
  isAiSide,
  matchReducer,
  parseConfig,
  type MatchConfig,
  type MatchState,
} from '../state/match.ts';

export interface MatchApi {
  match: MatchState;
  game: GameState;
  /** True while the AI's move is pending. */
  aiThinking: boolean;
  /** True when a human may click the board right now. */
  humanTurn: boolean;
  /** True when the cursor is behind the live end (browsing history). */
  viewingHistory: boolean;
  canUndo: boolean;
  canRedo: boolean;
  play: (index: number) => void;
  undo: () => void;
  redo: () => void;
  jump: (cursor: number) => void;
  newGame: (config?: Partial<MatchConfig>) => void;
  load: (config: MatchConfig, moves: readonly number[], cursor?: number) => void;
}

/** Delay before the AI answers, so moves feel considered rather than instant. */
function aiDelay(config: MatchConfig): number {
  return config.mode === 'ava' ? 650 : 380;
}

export function useMatch(onGameOver?: (config: MatchConfig, game: GameState) => void): MatchApi {
  const [match, dispatch] = useReducer(matchReducer, undefined, () => {
    const config = readJson('config', parseConfig, DEFAULT_CONFIG);
    const shared = typeof location !== 'undefined' ? readSharedGame(location.href) : null;
    if (!shared) return initialMatch(config);
    // A shared link opens in two-player mode so the AI doesn't interfere with the replay.
    return matchReducer(initialMatch(config), {
      type: 'load',
      config: { ...config, mode: 'hvh', variant: shared.variant },
      moves: shared.moves,
    });
  });

  // Drop the share code from the address bar so a refresh doesn't re-import it.
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const url = new URL(location.href);
    if (!url.searchParams.has(SHARE_PARAM)) return;
    url.searchParams.delete(SHARE_PARAM);
    history.replaceState(null, '', url.toString());
  }, []);
  const game = useMemo(() => currentGame(match), [match]);

  useEffect(() => writeJson('config', match.config), [match.config]);

  const live = match.cursor === match.moves.length;
  const aiTurn = live && game.status === 'playing' && isAiSide(match.config, game.toMove);

  // Schedule the AI's reply. Cancelled if anything about the position changes first.
  useEffect(() => {
    if (!aiTurn) return;
    let cancelled = false;
    let cancelRequest: (() => void) | null = null;
    const moves = match.moves.slice(0, match.cursor);
    const timer = setTimeout(() => {
      const req = requestMove(
        match.config.variant,
        moves,
        difficultyFor(match.config, game.toMove),
      );
      cancelRequest = req.cancel;
      void req.promise.then((index) => {
        if (!cancelled) dispatch({ type: 'play', index });
      });
    }, aiDelay(match.config));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelRequest?.();
    };
  }, [aiTurn, match.moves, match.cursor, match.config, match.gameId, game.toMove]);

  // Record the first result of each game exactly once (undoing a loss doesn't erase it).
  const recorded = useRef(-1);
  useEffect(() => {
    if (!live || game.status === 'playing' || recorded.current === match.gameId) return;
    recorded.current = match.gameId;
    onGameOver?.(match.config, game);
  }, [live, game, match.gameId, match.config, onGameOver]);

  const play = useCallback((index: number) => dispatch({ type: 'play', index }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const jump = useCallback((cursor: number) => dispatch({ type: 'jump', cursor }), []);
  const newGame = useCallback(
    (config?: Partial<MatchConfig>) =>
      dispatch(config ? { type: 'newGame', config } : { type: 'newGame' }),
    [],
  );
  const load = useCallback(
    (config: MatchConfig, moves: readonly number[], cursor?: number) =>
      dispatch(
        cursor === undefined
          ? { type: 'load', config, moves }
          : { type: 'load', config, moves, cursor },
      ),
    [],
  );

  return {
    match,
    game,
    aiThinking: aiTurn,
    humanTurn: game.status === 'playing' && !isAiSide(match.config, game.toMove),
    viewingHistory: !live,
    canUndo: canUndo(match),
    canRedo: canRedo(match),
    play,
    undo,
    redo,
    jump,
    newGame,
    load,
  };
}
