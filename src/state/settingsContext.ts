import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type Settings } from './settings.ts';

export interface SettingsApi {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsApi>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

export function useSettings(): SettingsApi {
  return useContext(SettingsContext);
}
