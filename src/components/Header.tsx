import { LOCALES, useT, type Locale } from '../i18n/index.ts';
import { THEME_MODES, type ThemeMode } from '../state/settings.ts';
import { useSettings } from '../state/settingsContext.ts';

const THEME_ICON: Record<ThemeMode, string> = { light: '☀', dark: '☾', system: '◐' };

export function Header({ locale }: { locale: Locale }) {
  const t = useT();
  const { settings, update } = useSettings();
  const nextTheme = THEME_MODES[(THEME_MODES.indexOf(settings.theme) + 1) % THEME_MODES.length]!;
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">{t('appTitle')}</h1>
        <p className="header__tagline">{t('tagline')}</p>
      </div>
      <div className="header__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => update({ theme: nextTheme })}
          aria-label={`${t('theme.label')}: ${t(`theme.${settings.theme}`)}`}
          title={`${t('theme.label')}: ${t(`theme.${settings.theme}`)}`}
          data-testid="theme-toggle"
        >
          <span aria-hidden="true">{THEME_ICON[settings.theme]}</span>
        </button>
        <label className="select">
          <span className="sr-only">{t('language.label')}</span>
          <select
            value={locale}
            onChange={(e) => update({ locale: e.target.value as Locale })}
            aria-label={t('language.label')}
            data-testid="language-select"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
