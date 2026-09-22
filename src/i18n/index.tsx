import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { MessageKey } from './en.ts';
import { translate, type Locale, type Params } from './translate.ts';

export type T = (key: MessageKey, params?: Params) => string;

const I18nContext = createContext<{ locale: Locale; t: T }>({
  locale: 'en',
  t: (key, params) => translate('en', key, params),
});

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useCallback<T>((key, params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): T {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export * from './translate.ts';
export type { MessageKey };
