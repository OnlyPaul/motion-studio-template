#!/usr/bin/env node
// Critique sheets from a rendered video. Stills (render.mjs --stills) show composition;
// these show what only real frames show: blur, pops, stutters, a bad loop seam.
//   node scripts/review.mjs --manifest <build>/manifest.json [--at 4.2] [--loop]
// -> <build>/review/<format>/contact.png  2 fps, whole film      <build>/review/<format>/phone.png  1 fps at 360 px wide
//    <build>/review/<format>/strip.png    12 consecutive frames from --at      <build>/review/<format>/loop_check.mp4  (--loop)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { args } from './lib/args.mjs';
import { readBuild, buildFile, saveBuild } from './lib/build.mjs';

const o = args({ manifest: '', format: '', at: -1, loop: false });
const build = readBuild(o.manifest);
const format = o.format || Object.keys(build.data.outputs)[0];
const item = build.data.outputs[format];
if (!item) throw new Error(`No format ${format}`);
const src = item.final || item.video;
const output = name => buildFile(build.dir, `review/${format}/${name}`);
if (!src || !existsSync(src)) { console.error('no video: render first (node render.mjs)'); process.exit(1); }

const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=width,height:format=duration', '-of', 'json', src], { encoding: 'utf8' });
const info = JSON.parse(probe.stdout);
const { width: w, height: h } = info.streams[0], dur = Number(info.format.duration);
const ff = (argv) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' });
  if (r.status) { console.error(r.stderr); process.exit(1); }
};
const sheet = (fps, thumbW, cols, out) => {
  const rows = Math.max(1, Math.ceil((dur * fps) / cols));
  ff(['-i', src, '-vf', `fps=${fps},scale=${thumbW}:-2,tile=${cols}x${rows}:padding=6:color=0x1a1a1c`, '-frames:v', '1', '-update', '1', out]);
  console.log(`${out}  (${fps} fps, ${cols}x${rows})`);
};

const portrait = h > w;
sheet(2, portrait ? 200 : 320, portrait ? 8 : 5, output('contact.png'));
sheet(1, 360, portrait ? 8 : 4, output('phone.png'));
if (o.at >= 0) {
  ff(['-ss', String(Math.max(0, o.at - 0.1)), '-i', src, '-vf', `scale=${portrait ? 200 : 320}:-2,tile=12x1:padding=4`, '-frames:v', '1', '-update', '1', output('strip.png')]);
  console.log(`${output('strip.png')}  (12 frames from ${Math.max(0, o.at - 0.1).toFixed(2)}s)`);
}
if (o.loop) {
  ff(['-stream_loop', '1', '-i', src, '-c', 'copy', output('loop_check.mp4')]);
  console.log(`${output('loop_check.mp4')}  (plays twice: watch the seam)`);
}
console.log(`\nsource ${src}  ${w}x${h}  ${dur.toFixed(2)}s. Inspect sheets, play video and listen; log evidence using (prompts/critique-pass.md).`);

item.review = { contact: output('contact.png'), phone: output('phone.png'), ...(o.at >= 0 && { strip: output('strip.png') }), ...(o.loop && { loop: output('loop_check.mp4') }) };
saveBuild(build.path, build.data);
