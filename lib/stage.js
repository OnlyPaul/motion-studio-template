// The stage: one call to film() turns scene functions into a seekable film.
//   window.seek(t)  paints frame t from nothing (render.mjs calls this)
//   window.ready    resolves once fonts and the beat grid are loaded
//   window.FILM     { dur, fps, format, w, h, loop, bpm, beats, downbeats, hits }
//   window.CUES     SFX cues from film({ cues }), written to out/cues.json by render.mjs
//   window.pixels() the composited frame (WebGL + 2D) as RGBA bytes
// Open with ?format=1x1 (or 16x9, 9x16, 1280x720) to reflow the same timeline.

export const FORMATS = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };

const query = new URLSearchParams(location.search);
export const RENDER = query.has('render') || navigator.webdriver;

// Everything a scene needs to lay itself out without fixed pixels.
function layout(format) {
  const [w, h] = FORMATS[format] ?? format.split('x').map(Number);
  const s = Math.min(w, h);
  const kind = w === h ? 'square' : h > w ? 'portrait' : 'landscape';
  return {
    format, w, h, cx: w / 2, cy: h / 2, kind,
    u: s / 100,      // 1u = 1% of the short side: size type and UI in u
    pad: s * 0.08,   // outer margin; keep text inside it
    // Per-format values: L.pick({ portrait: a, square: b, landscape: c, default: d }) or by format key.
    pick: (o) => o[format] ?? o[kind] ?? o.default,
  };
}

// The beat grid. Measured (beats.json) or generated from bpm. Times are seconds.
function beatGrid({ bpm, beats, downbeats, hits = [] }, meter = 4) {
  downbeats ??= beats.filter((_, i) => i % meter === 0);
  const spb = 60 / bpm;
  const pickT = (list, step) => (i) => (i < list.length ? list[i] : list.at(-1) + (i - list.length + 1) * step);
  return {
    bpm, spb, beats, downbeats, hits,
    beat: pickT(beats, spb),            // time of beat i (extrapolates past the end)
    bar: pickT(downbeats, spb * meter), // time of bar i
    // Beat position at t: { i, phase } with phase 0..1 between beat i and i+1.
    at(t) {
      let i = 0;
      while (i + 1 < beats.length && beats[i + 1] <= t) i++;
      const a = this.beat(i), b = this.beat(i + 1);
      return { i, phase: Math.min(1, Math.max(0, (t - a) / (b - a))) };
    },
  };
}

async function loadGrid(src, bpm, dur) {
  try {
    const res = await fetch(src, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (!(data.bpm > 0) || !Array.isArray(data.beats) || !data.beats.length || data.beats.some((t, i) => !Number.isFinite(t) || t < 0 || (i && t <= data.beats[i - 1]))) throw new Error('Invalid beat grid');
      return beatGrid(data);
    }
    if (res.status !== 404) throw new Error(`Beat grid HTTP ${res.status}`);
  } catch (error) { throw new Error(`Beat grid: ${error.message}`); }
  const spb = 60 / bpm, beats = [];
  for (let t = 0; t < dur + 4 * spb; t += spb) beats.push(+t.toFixed(4));
  return beatGrid({ bpm, beats });
}

async function loadFonts(fonts) {
  await Promise.all(fonts.map(async ({ family, src, weight = '400', style = 'normal' }) => {
    const face = new FontFace(family, `url(${src})`, { weight, style });
    document.fonts.add(await face.load()); // rejects loudly instead of silently falling back
  }));
  await document.fonts.ready;
}

// Scenes: [{ from, to, draw(g, f) }]. Every scene active at t is drawn in list order, so
// overlapping ranges give you transitions. f = { t (local), T (global), p (0..1), len, L, grid, dur, gl }.
function runScenes(list) {
  return (g, f) => {
    for (const s of list) {
      if (f.t < s.from || f.t >= s.to) continue;
      g.save();
      s.draw(g, { ...f, T: f.t, t: f.t - s.from, len: s.to - s.from, p: (f.t - s.from) / (s.to - s.from) });
      g.restore();
    }
  };
}

// WebGL layer (film({ webgl: true })): a WebGL2 canvas under the 2D canvas, so shaders and 3D
// sit behind crisp 2D type. Scenes get it as f.gl; the scenes builder gets { gl, canvas } as its
// third argument, the place to compile shaders, upload buffers and build a three.js scene once.
// Per-frame state (uniforms, transforms, camera) is set from t on every frame.
function webglLayer(stage, L, background, opts) {
  const canvas = document.createElement('canvas');
  canvas.id = 'gl'; canvas.width = L.w; canvas.height = L.h;
  stage.prepend(canvas);
  // preserveDrawingBuffer: frames are captured after seek() returns, not at the next vsync.
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true, ...opts });
  if (!gl) throw new Error('WebGL2 unavailable');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16) / 255);
  const clear = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, L.w, L.h);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  };
  return { gl, canvas, clear };
}

export function film({
  dur, fps = 60, format = '9x16', loop = false, bpm = 120, background = '#000',
  fonts = [], beats = 'beats.json', webgl = false, scenes, draw, cues,
}) {
  if (!Number.isFinite(dur) || dur <= 0 || !Number.isFinite(fps) || fps <= 0 || !Number.isFinite(bpm) || bpm <= 0) throw new Error('Invalid film timing');
  const L = layout(query.get('format') || format);
  if (![L.w, L.h].every(n => Number.isInteger(n) && n > 0)) throw new Error('Invalid film dimensions');
  document.head.insertAdjacentHTML('beforeend', '<style>html,body{margin:0;overflow:hidden}' +
    '#stage{position:absolute;top:0;left:0}#stage>canvas{position:absolute;top:0;left:0;display:block}</style>');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('c');
  canvas.width = L.w; canvas.height = L.h;
  stage.style.width = `${L.w}px`; stage.style.height = `${L.h}px`;
  const layer = webgl ? webglLayer(stage, L, background, webgl === true ? {} : webgl) : null;
  const g = canvas.getContext('2d', { alpha: !!layer }); // transparent over the WebGL layer
  let paint = () => {};

  // The composited frame as pixels (WebGL under 2D). check.mjs uses it for the loop seam.
  window.pixels = () => {
    const out = new OffscreenCanvas(L.w, L.h).getContext('2d');
    if (layer) out.drawImage(layer.canvas, 0, 0);
    out.drawImage(canvas, 0, 0);
    return out.getImageData(0, 0, L.w, L.h).data;
  };

  window.ready = (async () => {
    const [grid] = await Promise.all([loadGrid(beats, bpm, dur), loadFonts(fonts)]);
    const list = scenes ? scenes(grid, L, layer && { gl: layer.gl, canvas: layer.canvas }) : [];
    for (const s of list) if (!Number.isFinite(s.from) || s.from < 0 || !(s.to > s.from) || typeof s.draw !== 'function') throw new Error('Invalid scene timing or draw function');
    const boundaries = [...new Set(list.flatMap(s => [s.from, s.to]).filter(t => Number.isFinite(t) && t <= dur))].sort((a, b) => a - b);
    const render = scenes ? runScenes(list) : draw;
    if (typeof render !== 'function') throw new Error('Film requires scenes or draw');
    paint = (t) => {
      g.reset(); // no transform, alpha, filter, clip or pixel survives from the previous frame
      if (layer) layer.clear();
      else { g.fillStyle = background; g.fillRect(0, 0, L.w, L.h); }
      render(g, { t, L, grid, dur, gl: layer?.gl });
    };
    window.FILM = { dur, fps, loop, format: L.format, w: L.w, h: L.h, bpm: grid.bpm,
      beats: grid.beats, downbeats: grid.downbeats, hits: grid.hits, boundaries };
    window.CUES = cues ? cues(grid, L).sort((a, b) => a.t - b.t) : [];
    paint(0);
    if (!RENDER) preview(paint, grid, dur, fps, L);
  })();

  window.seek = (t) => { paint(Math.min(dur, Math.max(0, t))); return true; };
}

// preview-only:start  (the one place clocks are allowed; never runs in render mode)
const CSS = `html,body{height:100%;background:#0b0b0c;color:#cfcfd4;
font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}#stage{transform-origin:0 0}#bar{position:fixed;left:0;right:0;bottom:0;height:44px;display:flex;
align-items:center;gap:12px;padding:0 14px;background:#141416;border-top:1px solid #26262a}
#bar button,#bar select{background:#222226;color:inherit;border:1px solid #333;border-radius:4px;
font:inherit;padding:4px 8px}#bar input{flex:1;accent-color:#ff5a1f}#time{min-width:210px}`;

function preview(paint, grid, dur, fps, L) {
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  document.body.insertAdjacentHTML('beforeend', `<div id="bar"><button id="play">pause</button>
    <span id="time"></span><input id="scrub" type="range" min="0" max="${dur}" step="${1 / fps}">
    <select id="fmt">${Object.keys(FORMATS).map((k) => `<option${k === L.format ? ' selected' : ''}>${k}</option>`)}</select></div>`);
  const stage = document.getElementById('stage');
  const $ = (id) => document.getElementById(id);
  const fit = () => {
    const s = Math.min(innerWidth / L.w, (innerHeight - 44) / L.h);
    stage.style.transform = `translate(${(innerWidth - L.w * s) / 2}px,${(innerHeight - 44 - L.h * s) / 2}px) scale(${s})`;
  };
  fit(); addEventListener('resize', fit);

  let t = 0, playing = true, origin = performance.now();
  const show = () => {
    paint(t);
    const { i, phase } = grid.at(t);
    $('time').textContent = `${t.toFixed(3)}s  f${Math.round(t * fps)}  beat ${(i + phase).toFixed(2)}`;
    $('scrub').value = t;
    $('play').textContent = playing ? 'pause' : 'play';
  };
  const go = (to) => { t = Math.min(dur, Math.max(0, to)); playing = false; show(); };
  $('play').onclick = () => { playing = !playing; origin = performance.now() - t * 1000; show(); };
  $('scrub').oninput = (e) => go(+e.target.value);
  $('fmt').onchange = (e) => { query.set('format', e.target.value); location.search = query; };
  addEventListener('keydown', (e) => {
    const step = e.shiftKey ? grid.spb : 1 / fps;
    if (e.key === ' ') { e.preventDefault(); $('play').onclick(); }
    if (e.key === 'ArrowRight') go(t + step);
    if (e.key === 'ArrowLeft') go(t - step);
    if (e.key === 'Home') go(0);
  });
  (function tick() {
    if (playing) { t = ((performance.now() - origin) / 1000) % dur; show(); }
    requestAnimationFrame(tick);
  })();
}
// preview-only:end
