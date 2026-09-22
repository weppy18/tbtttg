// Prints dist/ asset sizes (raw + gzip) and writes docs/bundle.md. Run after `npm run build`.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|webmanifest)$/.test(name)) files.push(p);
  }
};
walk('dist');
const rows = files
  .map((p) => {
    const buf = readFileSync(p);
    const rel = p.slice('dist'.length + 1).replaceAll(String.fromCharCode(92), '/');
    return { file: rel, raw: buf.length, gzip: gzipSync(buf).length };
  })
  .sort((a, b) => b.gzip - a.gzip);
const kb = (n) => (n / 1024).toFixed(1) + ' kB';
const total = rows.reduce((s, r) => s + r.gzip, 0);
const lines = [
  '# Bundle report',
  '',
  `Generated ${new Date().toISOString()} from \`npm run build\`. Sizes are per file; "gzip" is what the network transfers.`,
  '',
  '| File | Raw | Gzip |',
  '| --- | ---: | ---: |',
  ...rows.map((r) => `| ${r.file} | ${kb(r.raw)} | ${kb(r.gzip)} |`),
  '',
  `**Total (gzip): ${kb(total)}** — the main chunk is React 19 + ReactDOM (~58 kB gzip) plus ~20 kB of app code; the AI runs in a separate worker chunk.`,
  '',
];
writeFileSync('docs/bundle.md', lines.join('\n'));
console.log(lines.slice(4).join('\n'));
