export function sampleTimes({ dur, fps, boundaries = [] }, count = 8) {
  const last = Math.max(0, (Math.round(dur * fps) - 1) / fps);
  const values = [0, last];
  for (const t of boundaries) for (const offset of [-1 / fps, 0, 1 / fps]) values.push(Math.max(0, Math.min(last, t + offset)));
  let seed = 1729;
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    values.push(Math.min(last, Math.floor(seed / 2 ** 32 * dur * fps) / fps));
  }
  return [...new Set(values)].sort((a, b) => a - b);
}
// Pixel differences include DOM, WebGL and canvas. A heuristic, not a motion-quality proof.
export async function seamReport(f) {
  const { dur, fps } = f.film;
  if (dur * fps < 6) throw new Error('Loop diagnostic requires at least six frames');
  const dt = 1 / fps, end = (Math.round(dur * fps) - 1) / fps;
  const times = [end - 2 * dt, end - dt, end, 0, dt, 2 * dt];
  const frames = [];
  for (const t of times) frames.push((await f.shot(t)).toString('base64'));
  return f.page.evaluate(async frames => {
    const pixels = await Promise.all(frames.map(async data => {
      const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
      c.drawImage(bitmap, 0, 0); bitmap.close();
      return c.getImageData(0, 0, c.canvas.width, c.canvas.height).data;
    }));
    const difference = (a, b) => {
      let sum = 0;
      for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[i + c]);
      return sum / (a.length / 4 * 3 * 255);
    };
    const steps = pixels.slice(1).map((p, i) => difference(p, pixels[i]));
    const adjacent = (steps[0] + steps[1] + steps[3] + steps[4]) / 4;
    return { times: 'last 3 → first 3 frames', steps, wrap: steps[2], adjacent,
      suspicious: steps[2] > Math.max(0.003, adjacent * 4),
      speedChange: Math.max(steps[1], steps[3]) > Math.max(0.003, Math.min(steps[1], steps[3]) * 4) };
  }, frames);
}
export async function validateFilm(f, open) {
  const times = sampleTimes(f.film);
  const { createHash } = await import('node:crypto');
  const hash = b => createHash('sha256').update(b).digest('hex');
  const forward = [];
  for (const t of times) forward.push(hash(await f.shot(t)));
  const other = await open();
  try {
    for (let i = times.length - 1; i >= 0; i--) {
      await other.shot(f.film.dur * 0.61); await other.shot(0.013);
      if (hash(await other.shot(times[i])) !== forward[i]) throw new Error(`seek(${times[i]}) is not deterministic`);
    }
  } finally { await other.page.close(); }
  const fonts = await f.page.evaluate(() => [...document.fonts].map(f => ({ family: f.family, status: f.status })));
  if (fonts.some(f => f.status !== 'loaded')) throw new Error('Font not loaded');
  const seam = f.film.loop ? await seamReport(f) : null;
  if (seam?.suspicious) throw new Error(`Suspicious loop jump: ${JSON.stringify(seam)}. Inspect seam playback.`);
  if (f.errors.length) throw new Error(f.errors.join(' | '));
  return { samples: times.length, fonts, seam };
}
