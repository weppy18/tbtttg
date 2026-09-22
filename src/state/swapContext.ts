import { createContext, useContext } from 'react';
import { other, type Player } from '../engine/index.ts';
import type { Profile } from './profiles.ts';
import { useProfiles } from './profilesContext.ts';

/**
 * In odd series games the participants swap marks. Components that show a
 * participant's identity (mark, colour, name) read it through this context so
 * the swap is invisible to them.
 */
export const SwapContext = createContext(false);

export function useSwapped(): boolean {
  return useContext(SwapContext);
}

/** The profile behind `player` in the current game, honouring a seat swap. */
export function useEffectiveProfile(): (player: Player) => Profile {
  const { profiles } = useProfiles();
  const swapped = useSwapped();
  return (player) => profiles[swapped ? other(player) : player];
}
