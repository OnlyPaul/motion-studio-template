#!/usr/bin/env node
// Beat grid for a score synthesized in code (no supplied track). Writes beats.json, which the
// film (lib/stage.js) and the SFX (scripts/sfx.mjs) both read.
// node scripts/beatgrid.mjs --bpm 120 --bars 8 [--meter 4] [--offset 0] [--out beats.json]
import { writeFileSync } from 'node:fs';
import { args } from './lib/args.mjs';

const o = args({ bpm: 120, bars: 8, meter: 4, offset: 0, out: 'beats.json' });
const spb = 60 / o.bpm;
const beats = Array.from({ length: o.bars * o.meter + 1 }, (_, i) => +(o.offset + i * spb).toFixed(4));
const grid = {
  source: 'grid', bpm: o.bpm, meter: o.meter,
  beats,                                            // state changes
  downbeats: beats.filter((_, i) => i % o.meter === 0), // scene cuts, the hook
  hits: beats,                                      // SFX (a measured track has onset peaks here)
};
writeFileSync(o.out, JSON.stringify(grid, null, 1));
console.log(`${o.bpm} BPM, ${o.bars} bars of ${o.meter} = ${(o.bars * o.meter * spb).toFixed(2)}s -> ${o.out}`);
