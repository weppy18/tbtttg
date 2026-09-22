import { GameScreen } from './components/GameScreen.tsx';
import { Header } from './components/Header.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { detectLocale } from './i18n/index.ts';
import { SettingsProvider } from './state/SettingsProvider.tsx';
import { useSettings } from './state/settingsContext.ts';

function Shell() {
  const { settings } = useSettings();
  useTheme(settings.theme);
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
