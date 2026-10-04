import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '../scripts/lib/server.mjs';
import { openFilm } from '../scripts/lib/film.mjs';
import { sampleTimes, validateFilm, seamReport } from '../scripts/lib/validation.mjs';
import { createBuild, saveBuild, readBuild, selectAudio, verifyAudio, buildFile } from '../scripts/lib/build.mjs';

const run = (...argv) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, argv); let output = '';
  child.stdout.on('data', b => output += b); child.stderr.on('data', b => output += b);
  child.on('error', reject); child.on('close', code => resolve({ code, output }));
});
test('boundary samples include both sides and are reproducible', () => {
  const film = { dur: 2, fps: 12, boundaries: [0, 1, 2] };
  const times = sampleTimes(film);
  for (const t of [1 - 1 / 12, 1, 1 + 1 / 12]) assert(times.includes(t));
  assert.deepEqual(times, sampleTimes(film));
});
test('builds isolate outputs, reject incomplete builds and changed audio', () => {
  const a = createBuild({ entry: 'tests/fixtures/film.html', film: 'test' });
  const b = createBuild({ entry: 'tests/fixtures/film.html', film: 'test' });
  try {
    assert.notEqual(a.dir, b.dir); assert.throws(() => readBuild(a.path), /incomplete/);
    assert.throws(() => buildFile(a.dir, '../escape'), /inside/);
    a.data.status = 'complete'; saveBuild(a.path, a.data);
    assert.throws(() => verifyAudio(a.data), /No audio/);
    const wav = join(a.dir, 'audio.wav'); writeFileSync(wav, 'a');
    selectAudio(a, [wav]); assert.deepEqual(verifyAudio(a.data), [wav]);
    writeFileSync(wav, 'b'); assert.throws(() => verifyAudio(a.data), /changed/);
  } finally { rmSync(a.dir, { recursive: true }); rmSync(b.dir, { recursive: true }); }
});
test('browser fixtures: transitions, DOM, loop, WebGL and failure detection', async t => {
  const server = await serve(); const browser = await chromium.launch();
  try {
    const open = (name, format = '64x64') => openFilm(browser, server.url, { entry: `tests/fixtures/${name}.html`, format });
    for (const name of ['film', 'loop', 'webgl']) await t.test(name, async () => {
      const f = await open(name);
      try { assert((await validateFilm(f, () => open(name))).samples > 5); }
      finally { await f.page.close(); }
    });
    await t.test('loop jump', async () => {
      const f = await open('bad-loop');
      try { assert((await seamReport(f)).suspicious); }
      finally { await f.page.close(); }
    });
    for (const name of ['invalid', 'missing-font']) await t.test(name, async () => {
      await assert.rejects(() => open(name));
    });
    await t.test('missing asset', async () => {
      const f = await open('missing-asset');
      await f.page.waitForLoadState('networkidle');
      await assert.rejects(() => f.shot(0), /missing-asset/); await f.page.close();
    });
    await t.test('loaded font', async () => {
      const font = process.env.TEST_FONT || ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(existsSync);
      assert(font, 'Set TEST_FONT to a local TTF for the font regression');
      const path = 'tests/fixtures/font.ttf'; copyFileSync(font, path);
      try {
        const f = await open('font');
        try { assert.equal((await validateFilm(f, () => open('font'))).fonts[0].status, 'loaded'); }
        finally { await f.page.close(); }
      } finally { rmSync(path); }
    });
  } finally { await browser.close(); server.close(); }
});
test('render exports empty cues and fails errors in a secondary worker', async () => {
  const ok = await run('render.mjs', '--entry', 'tests/fixtures/film.html', '--film', 'test-render', '--sub', '2', '--workers', '2');
  assert.equal(ok.code, 0, ok.output);
  const path = ok.output.match(/manifest: (.+)/)[1];
  const build = readBuild(path);
  try {
    assert.deepEqual(JSON.parse(readFileSync(build.data.outputs['64x64'].cues)).cues, []);
    assert(existsSync(build.data.outputs['64x64'].video));
    const noAudio = await run('scripts/mix.mjs', '--manifest', path);
    assert.notEqual(noAudio.code, 0); assert.match(noAudio.output, /No audio selected/);
    const sfx = await run('scripts/sfx.mjs', '--manifest', path);
    assert.equal(sfx.code, 0, sfx.output); // empty cues create silence, never reuse an earlier build
    const mix = await run('scripts/mix.mjs', '--manifest', path, '--audio', join(build.dir, 'sfx.wav'));
    assert.equal(mix.code, 0, mix.output);
    const final = readBuild(path).data.outputs['64x64'].final;
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', final], { encoding: 'utf8' });
    assert.equal(probe.status, 0, probe.stderr);
    const info = JSON.parse(probe.stdout);
    assert.deepEqual(info.streams.map(s => s.codec_type), ['video', 'audio']);
    assert.equal(Number(info.streams[0].nb_frames), 24);
    assert(Math.abs(Number(info.format.duration) - 2) < 0.1);
    const bed = await run('scripts/sfx.mjs', '--manifest', path, '--bed', 'beats.json', '--out', 'bed.wav');
    assert.equal(bed.code, 0, bed.output);
    const audibleMix = await run('scripts/mix.mjs', '--manifest', path, '--audio', join(build.dir, 'bed.wav'));
    assert.equal(audibleMix.code, 0, audibleMix.output);
    assert.equal(readBuild(path).data.outputs['64x64'].mix.silent, false);
    const review = await run('scripts/review.mjs', '--manifest', path, '--at', '0.5', '--loop');
    assert.equal(review.code, 0, review.output);
    assert(existsSync(readBuild(path).data.outputs['64x64'].review.loop));
  } finally { rmSync(build.dir, { recursive: true }); }
  const bad = await run('render.mjs', '--entry', 'tests/fixtures/worker-error.html', '--film', 'test-error', '--sub', '1', '--workers', '2');
  assert.notEqual(bad.code, 0); assert.match(bad.output, /worker fixture error/);
});
