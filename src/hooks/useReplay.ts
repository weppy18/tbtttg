import { useCallback, useEffect, useState } from 'react';

/**
 * Steps a cursor from 0 to `length` on a timer. Stops automatically when the
 * move list or game changes.
 */
export function useReplay(
  gameId: number,
  length: number,
  jump: (cursor: number) => void,
  stepMs = 650,
) {
  const [running, setRunning] = useState<{ gameId: number; length: number } | null>(null);
  const active = running !== null && running.gameId === gameId && running.length === length;

  useEffect(() => {
    if (!active) return;
    let cursor = 0;
    jump(0);
    const id = setInterval(() => {
      cursor += 1;
      jump(cursor);
      if (cursor >= length) {
        clearInterval(id);
        setRunning(null);
      }
    }, stepMs);
    return () => clearInterval(id);
  }, [active, length, jump, stepMs]);

  const start = useCallback(() => setRunning({ gameId, length }), [gameId, length]);
  const stop = useCallback(() => setRunning(null), []);
  return { replaying: active, start, stop };
}
