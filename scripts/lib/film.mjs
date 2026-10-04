// Open a film page in render mode and return a frame grabber bound to window.seek(t).
export async function openFilm(browser, base, { entry = 'index.html', format = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('response', r => {
    const optionalGrid = r.status() === 404 && /\/beats\.json$/.test(new URL(r.url()).pathname);
    if (r.status() >= 400 && !optionalGrid) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  page.on('requestfailed', r => errors.push(`Request failed: ${r.url()}`));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const optional = /beats\.json$/.test(m.location().url ?? ''); // no beats.json = grid from bpm
    if (m.type() === 'error' && !optional) errors.push(m.text());
  });

  const q = new URLSearchParams({ render: '1', ...(format && { format }) });
  await page.goto(`${base}/${entry}?${q}`);
  await page.waitForFunction(() => window.ready, null, { timeout: errors.length ? 1 : 15000 }).catch(() => {
    throw new Error(`${entry} never called film(): ${errors.join(' | ') || 'no window.ready'}`);
  });
  await page.evaluate(() => window.ready); // throws if a font or the grid failed to load
  const film = await page.evaluate(() => window.FILM);
  const cues = await page.evaluate(() => window.CUES);
  await page.setViewportSize({ width: film.w, height: film.h });

  const cdp = await page.context().newCDPSession(page);
  const clip = { x: 0, y: 0, width: film.w, height: film.h, scale: 1 };
  async function shot(t) {
    await page.evaluate((t) => window.seek(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip, optimizeForSpeed: true });
    if (errors.length) throw new Error(`Page errors: ${errors.join(' | ')}`);
    return Buffer.from(data, 'base64');
  }
  return { page, film, cues, shot, errors };
}
