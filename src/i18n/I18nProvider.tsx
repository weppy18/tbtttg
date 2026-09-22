import { useCallback, useMemo, type ReactNode } from 'react';
import { I18nContext, type T } from './context.ts';
import { translate, type Locale } from './translate.ts';

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useCallback<T>((key, params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
