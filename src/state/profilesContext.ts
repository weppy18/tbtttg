import { createContext, useContext } from 'react';
import type { Player } from '../engine/index.ts';
import { DEFAULT_PROFILES, type Profile, type Profiles } from './profiles.ts';

export interface ProfilesApi {
  profiles: Profiles;
  update: (player: Player, patch: Partial<Profile>) => void;
  reset: () => void;
}

export const ProfilesContext = createContext<ProfilesApi>({
  profiles: DEFAULT_PROFILES,
  update: () => {},
  reset: () => {},
});

export function useProfiles(): ProfilesApi {
  return useContext(ProfilesContext);
}
