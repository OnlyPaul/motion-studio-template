#!/usr/bin/env node
// Mix only explicitly selected audio from a completed render manifest.
// node scripts/mix.mjs --manifest <build>/manifest.json --audio music.wav,<build>/sfx.wav
// --format all shares the selected audio across formats; --out is relative to the build.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { args } from './lib/args.mjs';
import { readBuild, buildFile, selectAudio, verifyAudio, saveBuild } from './lib/build.mjs';

const o = args({ manifest: '', audio: '', out: 'final.mp4', lufs: -14, tp: -1, format: '' });
const build = readBuild(o.manifest);
if (o.audio) selectAudio(build, o.audio.split(','));
const audio = verifyAudio(build.data);

const ff = (argv) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-y', ...argv], { encoding: 'utf8' });
  if (r.status) { console.error(r.stderr.split('\n').slice(-8).join('\n')); process.exit(1); }
  return r.stderr;
};
const sum = (first) => {
  const ins = audio.map((_, i) => `[${i + first}:a]`).join('');
  return audio.length > 1 ? `${ins}amix=inputs=${audio.length}:normalize=0:duration=longest` : `${ins}anull`;
};
const norm = `loudnorm=I=${o.lufs}:TP=${o.tp}:LRA=11`;

// Pass 1: measure the mixed audio once.
const log = ff([...audio.flatMap((a) => ['-i', a]), '-filter_complex', `${sum(0)},${norm}:print_format=json`, '-f', 'null', '-']);
const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
const silent = !Number.isFinite(Number(m.input_i));
const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;

// Pass 2: apply, pad to picture length, mux without re-encoding the picture.
const formats = o.format === 'all' ? Object.keys(build.data.outputs) : [o.format || Object.keys(build.data.outputs)[0]];
const jobs = formats.map(format => {
  const item = build.data.outputs[format];
  if (!item?.video) throw new Error(`No video for ${format}`);
  if (item.range[0] !== 0 || item.range[1] !== item.film.dur) throw new Error('Mix requires a full-length render');
  return [item.video, buildFile(build.dir, formats.length > 1 ? o.out.replace(/(\.\w+)$/, `_${format}$1`) : o.out), item];
});
for (const [video, out, item] of jobs) {
  if (!existsSync(video)) { console.error(`missing ${video}: run node render.mjs first`); process.exit(1); }
  ff(['-i', video, ...audio.flatMap((a) => ['-i', a]),
    '-filter_complex', `${sum(1)},${silent ? 'anull' : `${norm}:${measured}`},aresample=48000,apad[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
  item.final = out;
  item.audio = structuredClone(build.data.audio);
  item.mix = { lufs: o.lufs, tp: o.tp, silent };
  saveBuild(build.path, build.data);
  console.log(`${video} + ${audio.join(' + ')} -> ${out}  (${silent ? 'silent audio preserved' : `measured ${m.input_i} LUFS -> ${o.lufs}`})`);
}
