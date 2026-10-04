#!/usr/bin/env node
// Synthesize SFX on the film's timeline. 48 kHz stereo 16-bit WAV. Deterministic.
//   node scripts/sfx.mjs --manifest <build>/manifest.json [--format 9x16] [--bed beats.json] [--out sfx.wav]
// Cues come from film({ cues }) via render.mjs: { t, type, gain = 1, pan = 0, note }.
// --bed adds a placeholder pulse (kick/clap/hat/bass) on the grid, for the animatic gate.
// Extend VOICES for a film; a real score belongs in its own script writing a separately named score.wav.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { args } from './lib/args.mjs';
import { readBuild, buildFile, saveBuild } from './lib/build.mjs';

const o = args({ manifest: '', format: '', bed: '', out: 'sfx.wav', dur: 0 });
const build = readBuild(o.manifest);
const format = o.format || Object.keys(build.data.outputs)[0];
const item = build.data.outputs[format];
if (!item) throw new Error(`No format ${format} in manifest`);
o.cues = item.cues;
o.out = buildFile(build.dir, o.out);
const SR = 48000, TAU = 2 * Math.PI;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// Phase of a linear sweep f0 -> f1 over len seconds, at time t.
const sweep = (t, f0, f1, len) => TAU * (f0 * t + ((f1 - f0) * t * t) / (2 * len));

// type: [length s, lead s (starts this long before t), (t, noise, note) => sample]
const VOICES = {
  click:  [0.04, 0, (t, n) => Math.sin(TAU * 2100 * t) * Math.exp(-t * 130) * 0.5 + n() * Math.exp(-t * 600) * 0.25],
  tick:   [0.03, 0, (t) => Math.sin(TAU * 4200 * t) * Math.exp(-t * 260) * 0.35],
  pop:    [0.14, 0, (t) => Math.sin(sweep(t, 950, 380, 0.14)) * Math.exp(-t * 32) * 0.45],
  thump:  [0.5, 0, (t, n) => Math.sin(sweep(t, 120, 42, 0.5)) * Math.exp(-t * 7) * 0.9 + n() * Math.exp(-t * 300) * 0.15],
  whoosh: [0.45, 0.2, (t, n) => n() * Math.sin((Math.PI * t) / 0.45) ** 2 * 0.3],
  riser:  [1.0, 1.0, (t, n) => (n() * 0.25 + Math.sin(sweep(t, 180, 1400, 1)) * 0.2) * (t / 1.0) ** 2.5],
  kick:   [0.35, 0, (t) => Math.sin(sweep(t, 150, 48, 0.35)) * Math.exp(-t * 11) * 0.9],
  hat:    [0.06, 0, (t, n) => n() * Math.exp(-t * 80) * 0.18],
  clap:   [0.2, 0, (t, n) => n() * (Math.exp(-t * 40) + Math.exp(-Math.max(0, t - 0.012) * 300) * (t > 0.012)) * 0.25],
  bass:   [0.45, 0, (t, _, note = 33) => (Math.sin(TAU * hz(note) * t) + 0.3 * Math.sin(2 * TAU * hz(note) * t)) * Math.min(1, t * 200) * Math.exp(-t * 4) * 0.5],
  pluck:  [0.7, 0, (t, _, note = 69) => [1, 2, 3].reduce((s, k) => s + Math.sin(TAU * hz(note) * k * t) * Math.exp(-t * 5 * k) / k, 0) * 0.3],
};

const doc = existsSync(o.cues) ? JSON.parse(readFileSync(o.cues, 'utf8')) : { cues: [] };
const cues = [...(doc.cues ?? doc)];
if (o.bed) {
  const grid = JSON.parse(readFileSync(o.bed, 'utf8'));
  const spb = 60 / grid.bpm, meter = grid.meter ?? 4;
  grid.beats.forEach((b, i) => {
    const inBar = i % meter;
    if (inBar === 0) cues.push({ t: b, type: 'kick', gain: 0.7 }, { t: b, type: 'bass', gain: 0.5, note: 33 });
    if (inBar === 2) cues.push({ t: b, type: 'kick', gain: 0.5 });
    if (inBar === 1 || inBar === 3) cues.push({ t: b, type: 'clap', gain: 0.5 });
    cues.push({ t: b + spb / 2, type: 'hat', gain: 0.5, pan: 0.3 });
  });
}
for (const cue of cues) if (!VOICES[cue.type]) throw new Error(`Unknown cue type: ${cue.type}`);

const end = Math.max(o.dur || doc.dur || 0, ...cues.map((c) => c.t + VOICES[c.type][0]));
const L = new Float32Array(Math.ceil(end * SR)), R = new Float32Array(L.length);
cues.forEach((c, k) => {
  const voice = VOICES[c.type];
  if (!voice) throw new Error(`unknown cue type "${c.type}" (have: ${Object.keys(VOICES).join(', ')})`);
  const [len, lead, fn] = voice;
  let seed = 0x9e3779b1 ^ (k * 2654435761);                 // per-cue noise, same every run
  const noise = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2147483648) - 1;
  const gain = c.gain ?? 1, pan = c.pan ?? 0;
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  const start = Math.round((c.t - lead) * SR);
  for (let i = 0; i < len * SR; i++) {
    const at = start + i;
    if (at < 0 || at >= L.length) continue;
    const s = fn(i / SR, noise, c.note);
    L[at] += s * gl; R[at] += s * gr;
  }
});

// Soft-clip to keep peaks under 0 dBFS; mix.mjs sets final loudness.
const wav = Buffer.alloc(44 + L.length * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + L.length * 4, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(L.length * 4, 40);
for (let i = 0; i < L.length; i++) {
  wav.writeInt16LE(Math.round(Math.tanh(L[i]) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.tanh(R[i]) * 32767), 46 + i * 4);
}
mkdirSync(dirname(o.out), { recursive: true });
writeFileSync(o.out, wav);
console.log(`${cues.length} cues, ${end.toFixed(2)}s -> ${o.out}`);

item.sfx = o.out;
saveBuild(build.path, build.data);
