import { useEffect, useState, type CSSProperties } from 'react';
import { GameScreen } from './components/GameScreen.tsx';
import { Header, type View } from './components/Header.tsx';
import { PuzzleScreen } from './components/PuzzleScreen.tsx';
import { Tour } from './components/Tour.tsx';
import { PwaStatus } from './components/PwaStatus.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { detectLocale } from './i18n/index.ts';
import { setSoundEnabled, unlockAudio } from './lib/sound.ts';
import { ProfilesProvider } from './state/ProfilesProvider.tsx';
import { useProfiles } from './state/profilesContext.ts';
import { SettingsProvider } from './state/SettingsProvider.tsx';
import { useSettings } from './state/settingsContext.ts';

function Shell() {
  const { settings, update } = useSettings();
  useTheme(settings.theme);
  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);
  useEffect(() => {
    // Browsers gate audio behind a user gesture; unlock on the first one.
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  const locale = settings.locale ?? detectLocale(navigator.languages ?? [navigator.language]);
  const { profiles } = useProfiles();
  const [view, setView] = useState<View>('play');
  const colours = {
    ...(profiles.X.color ? { '--x': profiles.X.color } : {}),
    ...(profiles.O.color ? { '--o': profiles.O.color } : {}),
  } as CSSProperties;
  return (
    <I18nProvider locale={locale}>
      <div className="app" lang={locale} style={colours}>
        <Header locale={locale} view={view} onView={setView} />
        <Tour open={!settings.seenTour} onDone={() => update({ seenTour: true })} />
        <main className="main">
          {view === 'daily' ? <PuzzleScreen onBack={() => setView('play')} /> : <GameScreen />}
        </main>
        <PwaStatus />
      </div>
    </I18nProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ProfilesProvider>
          <Shell />
        </ProfilesProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
