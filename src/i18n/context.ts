import { createContext, useContext } from 'react';
import type { MessageKey } from './en.ts';
import { translate, type Locale, type Params } from './translate.ts';

export type T = (key: MessageKey, params?: Params) => string;

export const I18nContext = createContext<{ locale: Locale; t: T }>({
  locale: 'en',
  t: (key, params) => translate('en', key, params),
});

export function useT(): T {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
