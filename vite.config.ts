import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Inline the (small) app stylesheet into index.html so the first paint never
 * waits on a render-blocking request. The CSS asset is dropped from the bundle
 * before the service worker precache is computed.
 */
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset' || typeof html.source !== 'string') return;
      let source = html.source;
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'asset' || !file.endsWith('.css')) continue;
        const css =
          typeof chunk.source === 'string' ? chunk.source : new TextDecoder().decode(chunk.source);
        const tag = source
          .match(/<link[^>]*rel="stylesheet"[^>]*>/g)
          ?.find((t) => t.includes(file));
        if (!tag) continue;
        source = source.replace(tag, `<style>${css}</style>`);
        delete bundle[file];
      }
      html.source = source;
    },
  };
}

// GitHub Pages serves project sites from /<repo>/ — override with BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    inlineCss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Tic-Tac-Toe: The Game',
        short_name: 'TicTacToe',
        description: 'The best web-based Tic-Tac-Toe: unbeatable AI, variants, offline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'en',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
