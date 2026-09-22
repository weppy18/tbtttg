import { useCallback, useState } from 'react';

export interface Announcer {
  message: string;
  nonce: number;
  announce: (message: string) => void;
}

/** Queue of screen-reader announcements. Each call bumps the nonce so repeats are re-read. */
export function useAnnouncer(): Announcer {
  const [state, setState] = useState({ message: '', nonce: 0 });
  const announce = useCallback(
    (message: string) => setState((s) => ({ message, nonce: s.nonce + 1 })),
    [],
  );
  return { ...state, announce };
}
