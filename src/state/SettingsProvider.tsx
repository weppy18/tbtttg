import { useCallback, useMemo, type ReactNode } from 'react';
import { usePersistedState } from '../hooks/usePersistedState.ts';
import { SettingsContext } from './settingsContext.ts';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from './settings.ts';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = usePersistedState('settings', DEFAULT_SETTINGS, parseSettings);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    [setSettings],
  );
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
