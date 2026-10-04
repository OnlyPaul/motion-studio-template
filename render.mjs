#!/usr/bin/env node
// Render the film (index.html -> window.seek(t)) to video or stills.
//
//   node render.mjs                              full film, 60 fps, 4 subframes -> <build>/silent.mp4
//   node render.mjs --format all                 9x16, 1x1, 16x9 -> <build>/silent_<fmt>.mp4
//   node render.mjs --from 4 --to 6              only those seconds -> <build>/part_4-6.mp4
//   node render.mjs --fps 30 --sub 1 --scale 0.5 --out animatic.mp4
//   node render.mjs --stills mid                 one still between each pair of beats (settled
//                                                states) -> <build>/stills/ + <build>/stills/contact.png
//   node render.mjs --stills beats|downbeats|0.5|1.2,3.4
//   node render.mjs --at 3.2 --out poster.png
//
// Motion blur: --sub N renders N subframes per frame spread over --shutter (fraction of a
// frame, 0.5 = 180 degrees) and averages them in ffmpeg. --workers N renders in parallel.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, resolve } from 'node:path';
import { serve } from './scripts/lib/server.mjs';
import { args } from './scripts/lib/args.mjs';
import { openFilm } from './scripts/lib/film.mjs';
import { createBuild, saveBuild, buildFile } from './scripts/lib/build.mjs';

const o = args({
  film: '', entry: 'index.html', format: '', fps: 0, sub: 4, shutter: 0.5, from: 0, to: 0, scale: 1,
  crf: 16, out: '', stills: '', at: -1, cols: 0,
  workers: Math.max(1, Math.min(6, Math.floor(availableParallelism() / 2))),
});
const ALL = ['9x16', '1x1', '16x9'];
const formats = o.format === 'all' ? ALL : [o.format];
const multi = formats.length > 1;
const suffixed = (path, fmt) => (multi ? path.replace(/(\.\w+)$/, `_${fmt}$1`) : path);

for (const k of ['fps', 'sub', 'workers', 'from', 'to', 'scale', 'shutter', 'crf', 'at', 'cols']) if (!Number.isFinite(o[k])) throw new Error(`Invalid --${k}`);
if (!Number.isInteger(o.sub) || o.sub < 1 || !Number.isInteger(o.workers) || o.workers < 1 || o.fps < 0 || o.from < 0 || o.to < 0 || o.scale <= 0 || o.shutter < 0 || o.shutter > 1) throw new Error('Invalid render settings');
const build = createBuild(o);
const output = name => buildFile(build.dir, name);
const encoders = new Set();
let server, browser;
const t0 = Date.now();
try {
  server = await serve();
  browser = await chromium.launch();
  build.data.runtime = { node: process.version, chromium: browser.version() };
  for (const fmt of formats) {
    const f = await openFilm(browser, server.url, { entry: o.entry, format: fmt });
    const { film } = f;
    const tag = `${film.format} ${film.w}x${film.h}`;
    const cuesPath = output(`cues_${film.format}.json`);
    write(cuesPath, JSON.stringify({ dur: film.dur, bpm: film.bpm, cues: f.cues }, null, 1));
    build.data.outputs[film.format] = { film, cues: cuesPath };
    saveBuild(build.path, build.data);

    if (o.at >= 0) {
      const out = output(suffixed(o.out || 'poster.png', film.format));
      write(out, await f.shot(o.at));
      build.data.outputs[film.format].poster = out;
      console.log(`${tag}  still t=${o.at}s -> ${out}`);
    } else if (o.stills) {
      const dir = multi ? `stills/${film.format}` : 'stills';
      const contact = output(o.out ? suffixed(o.out, film.format) : `${dir}/contact.png`);
      await stills(f, contact);
      build.data.outputs[film.format].contact = contact;
    } else {
      await video(f, tag);
    }
    if (f.errors.length) throw new Error(`Page errors: ${f.errors.join(' | ')}`);
    await f.page.close();
  }
  build.data.status = 'complete';
  saveBuild(build.path, build.data);
  console.log(`manifest: ${build.path}`);
} catch (error) {
  build.data.status = 'failed';
  build.data.error = error.message;
  saveBuild(build.path, build.data);
  throw error;
} finally {
  for (const ff of encoders) ff.kill();
  await browser?.close();
  server?.close();
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

// Frames [n0, n1) are split across --workers pages; each encodes its own chunk, then the
// chunks are concatenated without re-encoding. seek(t) being pure is what makes this safe.
async function video(f, tag) {
  const { film } = f;
  const fps = o.fps || film.fps, sub = Math.max(1, o.sub), to = o.to || film.dur;
  const partial = o.from > 0 || to < film.dur;
  if (!(to > o.from) || to > film.dur) throw new Error('Render range must be inside film duration');
  const out = output(suffixed(o.out || (partial ? `part_${o.from}-${to}.mp4` : 'silent.mp4'), film.format));
  build.data.outputs[film.format].video = out;
  build.data.outputs[film.format].range = [o.from, to];
  mkdirSync(dirname(out), { recursive: true });

  const n0 = Math.round(o.from * fps), n1 = Math.round(to * fps);
  if (n1 <= n0) throw new Error('Render range contains no frames');
  const W = Math.max(1, Math.min(o.workers, Math.ceil((n1 - n0) / fps)));
  const pages = [f, ...(await Promise.all(Array.from({ length: W - 1 },
    () => openFilm(browser, server.url, { entry: o.entry, format: film.format }))))];
  const bounds = Array.from({ length: W + 1 }, (_, i) => n0 + Math.round(((n1 - n0) * i) / W));
  const parts = W === 1 ? [out] : pages.map((_, i) => `${out}.part${i}.mp4`);

  let done = 0;
  const report = () => process.stdout.write(`\r${tag}  ${(done / fps).toFixed(1)}s / ${((n1 - n0) / fps).toFixed(1)}s  (${fps} fps x ${sub}, ${W} workers)   `);
  await Promise.all(pages.map(async (p, i) => {
    const ff = encoder(parts[i], fps, sub);
    for (let n = bounds[i]; n < bounds[i + 1]; n++) {
      for (let j = 0; j < sub; j++) {
        const off = sub > 1 ? (((j + 0.5) / sub - 0.5) * o.shutter) / fps : 0;
        const png = await p.shot(Math.min(film.dur, Math.max(0, n / fps + off)));
        if (!ff.stdin.write(png)) await Promise.race([new Promise((r) => ff.stdin.once('drain', r)), ff.closed.then(() => { throw new Error('Encoder closed early'); })]);
      }
      if (++done % fps === 0) report();
    }
    ff.stdin.end();
    await ff.closed;
    if (p.errors.length) throw new Error(`Worker ${i}: ${p.errors.join(' | ')}`);
  }));
  report();

  if (W > 1) {
    const list = `${out}.parts.txt`;
    writeFileSync(list, parts.map((p) => `file '${resolve(p)}'`).join('\n'));
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
    if (r.status) throw new Error(`concat failed: ${r.stderr}`);
    [list, ...parts].forEach((p) => rmSync(p));
    await Promise.all(pages.slice(1).map((p) => p.page.close()));
  }
  console.log(`\n-> ${out}`);
}

function encoder(out, fps, sub) {
  const vf = [];
  if (sub > 1) vf.push(`tmix=frames=${sub}`, `select='eq(mod(n\\,${sub})\\,${sub - 1})'`);
  vf.push(`setpts=N/(${fps}*TB)`);
  if (o.scale !== 1) vf.push(`scale=trunc(iw*${o.scale}/2)*2:-2:flags=lanczos`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png',
    '-framerate', String(fps * sub), '-i', '-', '-vf', vf.join(','), '-r', String(fps),
    '-c:v', 'libx264', '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  encoders.add(ff);
  ff.closed = new Promise((ok, fail) => {
    ff.on('error', fail); ff.stdin.on('error', fail);
    ff.on('close', c => { encoders.delete(ff); c ? fail(new Error(`ffmpeg exited ${c}`)) : ok(); });
  });
  ff.closed.catch(() => {});
  return ff;
}

async function stills(f, sheetPath) {
  const { film } = f, to = o.to || film.dur, s = o.stills;
  let times;
  if (s === 'beats' || s === 'downbeats') times = film[s];
  else if (s === 'mid') times = film.beats.slice(0, -1).map((b, i) => (b + film.beats[i + 1]) / 2); // settled states
  else if (s.includes(',')) times = s.split(',').map(Number);
  else {
    const step = Number(s);
    if (!Number.isFinite(step) || step <= 0) throw new Error('Still interval must be positive');
    times = Array.from({ length: Math.ceil((to - o.from) / step) }, (_, i) => o.from + i * step);
  }
  times = times.filter((t) => t >= o.from && t < to);

  if (!times.length || times.some(t => !Number.isFinite(t))) throw new Error('No valid still timestamps');
  const dir = dirname(sheetPath);
  const items = [];
  for (const t of times) {
    const png = await f.shot(t);
    write(`${dir}/t${t.toFixed(3).padStart(7, '0')}.png`, png);
    const beat = film.beats.findLastIndex((b) => b <= t + 1e-6);
    items.push({ t, beat, down: film.downbeats.some((d) => Math.abs(d - t) < 1e-3), src: `data:image/png;base64,${png.toString('base64')}` });
  }

  // Contact sheet built in the browser so every frame is labelled with its time and beat.
  const portrait = film.h > film.w;
  const cols = o.cols || (portrait ? 8 : film.w === film.h ? 6 : 4);
  const thumb = portrait ? 200 : film.w === film.h ? 260 : 380;
  const page = await browser.newPage({ viewport: { width: cols * (thumb + 12) + 12, height: 400 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0;padding:12px;background:#1a1a1c;font:600 13px Menlo,monospace;color:#aaa}
    .g{display:grid;grid-template-columns:repeat(${cols},${thumb}px);gap:12px}img{width:${thumb}px;display:block}
    .d span{color:#ff7a45}</style><div class="g">${items.map((it) =>
    `<div class="${it.down ? 'd' : ''}"><img src="${it.src}"><span>${it.t.toFixed(2)}s · b${it.beat}${it.down ? ' · bar' : ''}</span></div>`).join('')}</div>`);
  write(sheetPath, await page.screenshot({ fullPage: true }));
  await page.close();
  console.log(`${film.format}  ${items.length} stills -> ${dir}/  contact sheet -> ${sheetPath}`);
}
