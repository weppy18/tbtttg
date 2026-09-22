# Tic-Tac-Toe: The Game

The best web-based Tic-Tac-Toe: a provably unbeatable AI with four distinct difficulty levels, Misère / 4×4 / 5×5 / **Ultimate** variants, hints and post-game analysis, shareable replays, player profiles, EN/FR, full keyboard and screen-reader support, and offline-first PWA install. Zero backend.

**Live demo:** https://weppy18.github.io/tbtttg/ (deployed from `main` by GitHub Actions)

## Features

- **Modes:** two players (local), versus AI (pick your side), AI vs AI watch mode.
- **AI:** negamax with alpha-beta pruning and a transposition table. _Impossible_ is perfect on 3×3 — a test plays it against **every** opponent line as X and as O and asserts it never loses. _Easy / Medium / Hard_ have measured, distinct loss rates.
- **Variants:** Classic 3×3, Misère (three in a row loses), 4×4, 5×5 (four in a row), Ultimate (nine boards, with its own iterative-deepening AI). Rules explained in-app.
- **Learn:** hint button (H), post-game analysis grading every move (best / good / inaccuracy / mistake / blunder) with best alternatives shown on the board, clickable move history with replay.
- **Share:** any finished game encodes into the URL (`?g=classic.4083`) and replays for whoever opens it.
- **Feel:** SVG marks that draw in, winning-line stroke, board shake on illegal moves, confetti, generated Web Audio SFX with mute. Respects `prefers-reduced-motion`.
- **Access:** arrow keys + Enter, 1–9 keys, roving tabindex, ARIA labels, polite live-region announcements for every move and result, visible focus rings. Lighthouse accessibility 100.
- **Personal:** names, colours and custom marks (emoji) per player; light/dark/system theme; English and French (auto-detected).
- **Offline:** installable PWA with precached assets; scoreboard, settings and profiles persist in localStorage.

## Lighthouse (mobile, production build)

| Performance | Accessibility | Best Practices |   SEO   |
| :---------: | :-----------: | :------------: | :-----: |
|   **100**   |    **100**    |    **100**     | **100** |

FCP 1.2 s · LCP 1.5 s · TBT 0 ms · CLS 0 (simulated Moto G, slow 4G). Reproduce with `npm run build && npm run lighthouse`; the recorded run lives in [`docs/lighthouse-mobile.json`](docs/lighthouse-mobile.json).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: engine + state, 100% coverage enforced
npm run test:e2e   # Playwright: desktop + mobile flows (builds first: npm run build)
npm run build      # static output in dist/
```

## Stack

React 19 + TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) on Vite — chosen over Next.js because there is no server: a static bundle is simpler, smaller and deploys anywhere. Vitest for the engine, Playwright for end-to-end, ESLint + Prettier, `vite-plugin-pwa` for the service worker and manifest.

## Architecture

```
src/engine/     pure TypeScript, no React — the only place game rules live
  types.ts      GameState (immutable), Rules {size, winLength, misere}
  lines.ts      precomputed K-in-a-row lines for any N×N board
  game.ts       createGame / applyMove / replay / undo — every function returns a new state
  ai.ts         negamax + alpha-beta + transposition table; difficulty policies
  analysis.ts   grades each move against perfect play
  ultimate.ts   Ultimate rules + heuristic iterative-deepening search
  adapter.ts    one entry point per operation, dispatched by variant
src/state/      match reducer (moves + cursor = undo/redo/replay), stats, settings, profiles
src/workers/    the AI runs in a Web Worker so deep searches never block a frame
src/hooks/      useMatch (AI scheduling, result recording), useAnalysis, useReplay, ...
src/components/ Board, UltimateBoard, Mark, Confetti, SetupPanel, Scoreboard, MoveHistory, ...
src/i18n/       en.ts is the source of truth; a test asserts fr.ts covers every key
```

The match is stored as a full move list plus a cursor. Undo/redo/jump only move the cursor; the engine state is derived by replaying, which makes history browsing, replay and shareable links trivial and impossible to desynchronise.

## Deploy

Pushing to `main` builds and publishes `dist/` to GitHub Pages (`.github/workflows/deploy.yml`). The same `dist/` works on Netlify or Cloudflare Pages as-is; set `BASE_PATH=/` (default) when hosting at a domain root.
