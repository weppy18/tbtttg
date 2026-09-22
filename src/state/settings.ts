import { isLocale, type Locale } from '../i18n/translate.ts';
import { isRecord, oneOf } from '../lib/storage.ts';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

export interface Settings {
  readonly theme: ThemeMode;
  readonly locale: Locale | null; // null = auto-detect
  readonly sound: boolean;
  readonly seenTour: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  locale: null,
  sound: true,
  seenTour: false,
};

export function parseSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null;
  return {
    theme: oneOf(raw.theme, THEME_MODES) ?? DEFAULT_SETTINGS.theme,
    locale: isLocale(raw.locale) ? raw.locale : null,
    sound: typeof raw.sound === 'boolean' ? raw.sound : DEFAULT_SETTINGS.sound,
    seenTour: raw.seenTour === true,
  };
}
