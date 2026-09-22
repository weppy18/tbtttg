import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisOptions, rulesFor, type GameAnalysis, type VariantId } from '../engine/index.ts';
import { requestAnalysis, requestEvaluation } from '../lib/aiClient.ts';

interface HintState {
  key: string;
  index: number;
}

interface AnalysisState {
  key: string;
  analysis: GameAnalysis | null;
  running: boolean;
}

/**
 * Hint and post-game analysis, both computed off-thread. Results are tagged
 * with a key of (game, position) so stale answers are never shown.
 */
export function useAnalysis(
  variant: VariantId,
  gameId: number,
  moves: readonly number[],
  cursor: number,
) {
  const positionKey = `${gameId}:${variant}:${moves.slice(0, cursor).join(',')}`;
  const gameKey = `${gameId}:${variant}:${moves.join(',')}`;

  const [hint, setHint] = useState<HintState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const requestHint = useCallback(() => {
    const key = positionKey;
    const req = requestEvaluation(
      variant,
      moves.slice(0, cursor),
      analysisOptions(rulesFor(variant)),
    );
    cancelRef.current = req.cancel;
    void req.promise.then((evals) => {
      if (evals.length === 0) return;
      const top = evals[0]!.score;
      const best = evals.filter((e) => e.score === top);
      const pick = best[Math.floor(Math.random() * best.length)]!;
      setHint({ key, index: pick.index });
    });
  }, [variant, moves, cursor, positionKey]);

  const analyse = useCallback(() => {
    const key = gameKey;
    setAnalysis({ key, analysis: null, running: true });
    const req = requestAnalysis(variant, moves);
    cancelRef.current = req.cancel;
    void req.promise.then((result) => setAnalysis({ key, analysis: result, running: false }));
  }, [variant, moves, gameKey]);

  return {
    hint: hint?.key === positionKey ? hint.index : null,
    requestHint,
    analysis: analysis?.key === gameKey ? analysis.analysis : null,
    analysing: analysis?.key === gameKey && analysis.running,
    analyse,
  };
}
