// Each render owns a fresh directory. Downstream commands require its manifest explicitly.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

export const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
export function snapshot(entry) {
  const files = new Set();
  const visit = (p) => {
    if (!existsSync(p)) return;
    if (statSync(p).isDirectory()) readdirSync(p).filter(n => !n.startsWith('.')).sort().forEach(n => visit(join(p, n)));
    else files.add(p);
  };
  [entry, 'lib', 'scenes', 'scripts', 'assets', 'audio', 'beats.json', 'render.mjs', 'package-lock.json'].forEach(visit);
  return Object.fromEntries([...files].sort().map(p => [p, digest(p)]));
}
export function createBuild(options) {
  const name = options.film || basename(options.entry, '.html');
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('--film must contain only letters, numbers, _ or -');
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  const dir = resolve('out', name, id);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'manifest.json');
  const data = { version: 1, id, film: name, created: new Date().toISOString(), status: 'rendering', options,
    sources: snapshot(options.entry), outputs: {}, audio: [] };
  saveBuild(path, data);
  return { path, dir, data };
}
export function saveBuild(path, data) { writeFileSync(path, JSON.stringify(data, null, 2) + '\n'); }
export function readBuild(path) {
  if (!path) throw new Error('--manifest <build>/manifest.json is required');
  path = resolve(path);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.version !== 1 || data.status !== 'complete') throw new Error('Build is incomplete or unsupported');
  return { path, dir: dirname(path), data };
}
export function buildFile(dir, name) {
  const path = resolve(dir, name);
  if (!path.startsWith(resolve(dir) + '/')) throw new Error('Output must be inside this build directory');
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
export function selectAudio(build, paths) {
  build.data.audio = paths.map(path => ({ path: resolve(path), sha256: digest(path) }));
  saveBuild(build.path, build.data);
}
export function verifyAudio(data) {
  if (!data.audio.length) throw new Error('No audio selected: use --audio file.wav[,score.wav]');
  return data.audio.map(a => {
    if (!existsSync(a.path) || digest(a.path) !== a.sha256) throw new Error(`Selected audio missing or changed: ${a.path}`);
    return a.path;
  });
}
