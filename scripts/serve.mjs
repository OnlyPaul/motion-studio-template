#!/usr/bin/env node
// Live preview at http://localhost:5173 (PORT to change).
// Space play/pause · ←/→ one frame · shift+←/→ one beat · Home to 0 · ?format=1x1 / 16x9
import { serve } from './lib/server.mjs';

const { url } = await serve(process.cwd(), Number(process.env.PORT) || 5173, 'localhost');
console.log(`preview: ${url}/index.html   (?format=1x1 | 16x9)`);
