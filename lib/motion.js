// Motion primitives. Every export is a pure function of its arguments:
// no clocks, no Math.random, no state carried between calls. Safe inside seek(t).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
// Linear 0..1 progress of t through [a, b]. For wipes, draw-ons and camera trucks;
// Choose springs or curves according to the film’s style guide.
export const progress = (t, a, b) => clamp((t - a) / (b - a));
// Wrap t into [0, dur) for seamless loops.
export const loopT = (t, dur) => ((t % dur) + dur) % dur;

// Spring presets (mass 1). zeta = d / (2 * sqrt(k)).
export const SPRING = {
  snappy:  { k: 400, d: 32 },  // zeta 0.80, ~1.5% overshoot: buttons, toggles, leading edges
  default: { k: 170, d: 23 },  // zeta 0.88, barely-there overshoot: cards, containers, camera
  heavy:   { k: 64,  d: 16 },  // zeta 1.00, none: big type, 3D objects, logo lockups
  playful: { k: 260, d: 14 },  // zeta 0.43, ~22% overshoot: mascots, stickers only
};

// Closed-form damped spring from 0 to 1, starting at rest at t = 0.
export function spring(t, { k, d } = SPRING.default) {
  if (t <= 0) return 0;
  const w = Math.sqrt(k), z = d / (2 * w);
  if (Math.abs(z - 1) < 1e-4) return 1 - Math.exp(-w * t) * (1 + w * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  const s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s;
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}

// A value that changes target several times: one spring per change, summed.
// keys: [[time, value], ...] sorted by time. Frame 812 never needs frames 0..811.
export function track(t, keys, cfg = SPRING.default) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], cfg);
  return v;
}

// Same as track() for hex colours, per channel, clamped. Returns 'rgb(r g b)'.
export function trackColor(t, keys, cfg = SPRING.default) {
  const ch = (i) => track(t, keys.map(([kt, hex]) => [kt, parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)]), cfg);
  return `rgb(${[0, 1, 2].map((i) => Math.round(clamp(ch(i), 0, 255))).join(' ')})`;
}

// Two edges that stretch: the edge in the direction of travel leads on a stiffer spring.
// keys: [[time, left, right], ...]. Returns [left, right]. Tab indicators, morphing bars.
export function stretch(t, keys, lead = SPRING.snappy, trail = SPRING.default) {
  let L = keys[0][1], R = keys[0][2];
  for (let i = 1; i < keys.length; i++) {
    const [ti, l, r] = keys[i], [, pl, pr] = keys[i - 1];
    const right = l + r > pl + pr;
    L += (l - pl) * spring(t - ti, right ? trail : lead);
    R += (r - pr) * spring(t - ti, right ? lead : trail);
  }
  return [L, R];
}

// Content inside a morphing container: in shortly after the morph starts at tIn,
// out before the next morph at tOut, so two contents never overlap.
export function swap(t, tIn, tOut = Infinity, delay = 0.08, fade = 0.12) {
  return Math.min(clamp((t - tIn - delay) / fade), clamp((tOut - 0.02 - t) / fade));
}

// Seeded randomness. rng() is a sequence (order-dependent, create it inside draw);
// rand(seed, i) is stateless and usually what you want per element.
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = (seed, i = 0) => rng((seed * 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b))();

// Smooth 1D value noise in [-1, 1], a pure function of x. For wobble, drift, handheld camera.
export function noise(x, seed = 1) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(rand(seed, i), rand(seed, i + 1), u) * 2 - 1;
}
