import { en, type MessageKey } from './en.ts';
import { fr } from './fr.ts';

export type Locale = 'en' | 'fr';
export const LOCALES: readonly Locale[] = ['en', 'fr'];

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, fr };

export type Params = Record<string, string | number>;

/** Substitute `{name}` placeholders. Missing params are left as-is so gaps are visible. */
export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return format(MESSAGES[locale][key], params);
}

/** Pick the best supported locale from the browser's language preferences. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'fr') return 'fr';
    if (base === 'en') return 'en';
  }
  return 'en';
}

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'fr';
}
