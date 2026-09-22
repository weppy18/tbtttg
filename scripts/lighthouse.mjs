// Runs Lighthouse (mobile, all four categories) against a production preview.
// Usage: npm run build && npm run lighthouse   (needs Chrome; set CHROME_PATH if not found)
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';

const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
  stdio: 'ignore',
  shell: true,
});
await new Promise((r) => setTimeout(r, 2500));
try {
  await new Promise((resolve, reject) => {
    const lh = spawn(
      'npx',
      [
        'lighthouse',
        'http://localhost:4173/',
        '--form-factor=mobile',
        '--output=json',
        '--output-path=./lighthouse.json',
        '--chrome-flags=--headless=new --no-sandbox',
        '--quiet',
        '--only-categories=performance,accessibility,best-practices,seo',
      ],
      { stdio: 'inherit', shell: true },
    );
    lh.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`lighthouse exited ${code}`)),
    );
  });
  const r = JSON.parse(readFileSync('./lighthouse.json', 'utf8'));
  const out = {
    fetchTime: r.fetchTime,
    lighthouseVersion: r.lighthouseVersion,
    formFactor: 'mobile',
    url: r.finalDisplayedUrl,
    scores: Object.fromEntries(
      Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
    ),
    metrics: Object.fromEntries(
      [
        'first-contentful-paint',
        'largest-contentful-paint',
        'total-blocking-time',
        'cumulative-layout-shift',
        'speed-index',
        'interactive',
      ].map((id) => [id, r.audits[id].displayValue]),
    ),
  };
  writeFileSync('docs/lighthouse-mobile.json', JSON.stringify(out, null, 2) + '\n');
  console.log(out.scores, out.metrics);
} finally {
  preview.kill();
}
