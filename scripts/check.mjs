#!/usr/bin/env node
// Render-contract check. Run after every edit, and always before showing a render.
//   1. lint film code for clocks, unseeded randomness, timers and CSS/Web animation
//   2. seek(t) is deterministic and stateless: boundary + seeded frames in order, reversed and scrubbed, all requested formats
//   3. no page errors, every declared font loaded
//   4. loop films: actual wrap compared to neighboring frame changes (heuristic)
// node scripts/check.mjs [--entry index.html] [--format all|9x16,1x1]
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from './lib/server.mjs';
import { args } from './lib/args.mjs';
import { openFilm } from './lib/film.mjs';
import { validateFilm } from './lib/validation.mjs';

const o = args({ entry: 'index.html', format: 'all' });
const problems = [];

// 1. Lint. Lines between "preview-only:start" and "preview-only:end" are exempt.
const RULES = [
  [/Math\.random\s*\(/, 'Math.random: use rand(seed, i) or noise(x, seed) from lib/motion.js'],
  [/\bDate\.now\s*\(|\bnew Date\s*\(|performance\.now\s*\(/, 'wall clock: derive everything from t'],
  [/\bset(Timeout|Interval)\s*\(/, 'timer: derive everything from t'],
  [/requestAnimationFrame\s*\(/, 'requestAnimationFrame outside the preview block'],
  [/(^|[\s;{"'])transition\s*:/, 'CSS transition: compute the value in seek(t)'],
  [/(^|[\s;{"'])animation\s*:|@keyframes/, 'CSS animation: compute the value in seek(t)'],
  [/\.animate\s*\(/, 'Web Animations API: compute the value in seek(t)'],
  [/\bClock\s*\(|\.getDelta\s*\(|\.getElapsedTime\s*\(/, 'three.js clock: drive from t (mixer.setTime(t), uniforms from t)'],
  [/will-change/, 'will-change: blurs text the camera scales'],
];
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = [o.entry, ...['lib', 'scenes'].filter(existsSync).flatMap(walk)].filter((f) => /\.(html|m?js|css)$/.test(f));
for (const file of files) {
  let exempt = false;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('preview-only:start')) exempt = true;
    if (line.includes('preview-only:end')) exempt = false;
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    if (exempt || code.trim().startsWith('*')) return;
    for (const [re, why] of RULES) if (re.test(code)) problems.push(`${file}:${i + 1}  ${why}`);
  });
}
console.log(`lint        ${files.length} files`);

// 2-4. Runtime checks in headless Chromium.
const server = await serve();
const browser = await chromium.launch();
try {
  const formats = o.format === 'all' ? ['9x16', '1x1', '16x9'] : o.format.split(',');
  for (const format of formats) {
    const open = () => openFilm(browser, server.url, { entry: o.entry, format });
    const f = await open();
    try {
      const result = await validateFilm(f, open);
      console.log(`${format}: ${result.samples} deterministic frames, ${result.fonts.length} fonts loaded`);
      if (result.seam) console.log(`loop diagnostic: ${JSON.stringify(result.seam)}; playback review required`);
    } finally { await f.page.close(); }
  }

} catch (e) {
  problems.push(`page failed to load: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(`\nFAIL (${problems.length})\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}
console.log('\nOK: sampled render checks passed (visual and audio review still required)');
