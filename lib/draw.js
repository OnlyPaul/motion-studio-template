// Canvas helpers for type and shapes. Pure: they read the context, never keep state.

// Set a font. size in px; family is a CSS family list.
export function font(g, size, weight = 700, family = 'system-ui, sans-serif') {
  g.font = `${weight} ${size}px ${family}`;
}

// Largest size (<= max) at which every line fits in maxW with the given weight/family.
export function fitSize(g, lines, maxW, weight, family, max = 400) {
  font(g, 100, weight, family);
  const widest = Math.max(...lines.map((s) => g.measureText(s).width));
  return Math.min(max, (100 * maxW) / widest);
}

// Per-glyph x offsets for kinetic type, kerning-aware (measured on prefixes).
// Returns [{ ch, x, w, i }]. Uses the context's current font.
export function glyphs(g, text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const x = g.measureText(text.slice(0, i)).width;
    out.push({ ch: text[i], x, w: g.measureText(text.slice(0, i + 1)).width - x, i });
  }
  return out;
}

// Rounded rect path (radius clamped to half the short side). Call fill()/stroke() after.
export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
