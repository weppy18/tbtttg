import { useEffect } from 'react';
import type { ThemeMode } from '../state/settings.ts';

const query = '(prefers-color-scheme: dark)';

/** Applies `data-theme="light|dark"` to <html>, following the OS when mode is 'system'. */
export function useTheme(mode: ThemeMode): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && window.matchMedia(query).matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = dark ? '#0b1020' : '#f5f4ef';
    };
    apply();
    if (mode !== 'system') return;
    const mq = window.matchMedia(query);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
}
