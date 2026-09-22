import { useEffect } from 'react';
import { GameScreen } from './components/GameScreen.tsx';
import { Header } from './components/Header.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { detectLocale } from './i18n/index.ts';
import { setSoundEnabled, unlockAudio } from './lib/sound.ts';
import { SettingsProvider } from './state/SettingsProvider.tsx';
import { useSettings } from './state/settingsContext.ts';

function Shell() {
  const { settings } = useSettings();
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
  return (
    <I18nProvider locale={locale}>
      <div className="app" lang={locale}>
        <Header locale={locale} />
        <main className="main">
          <GameScreen />
        </main>
      </div>
    </I18nProvider>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
