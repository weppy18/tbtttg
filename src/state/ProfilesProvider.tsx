import { useCallback, useMemo, type ReactNode } from 'react';
import type { Player } from '../engine/index.ts';
import { usePersistedState } from '../hooks/usePersistedState.ts';
import { DEFAULT_PROFILES, parseProfiles, type Profile } from './profiles.ts';
import { ProfilesContext } from './profilesContext.ts';

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = usePersistedState('profiles', DEFAULT_PROFILES, parseProfiles);
  const update = useCallback(
    (player: Player, patch: Partial<Profile>) =>
      setProfiles((p) => ({ ...p, [player]: { ...p[player], ...patch } })),
    [setProfiles],
  );
  const reset = useCallback(() => setProfiles(DEFAULT_PROFILES), [setProfiles]);
  const value = useMemo(() => ({ profiles, update, reset }), [profiles, update, reset]);
  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}
