// --key value / --key=value / --flag. Types follow the defaults (number, boolean, string).
export function args(defaults) {
  const out = { ...defaults, _: [] };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { out._.push(argv[i]); continue; }
    const [k, inline] = argv[i].slice(2).split(/=(.*)/s);
    const takesValue = typeof defaults[k] !== 'boolean';
    const v = inline ?? (takesValue && i + 1 < argv.length && !/^--[a-z]/i.test(argv[i + 1]) ? argv[++i] : 'true');
    if (!(k in defaults)) { console.error(`unknown option --${k}`); process.exit(2); }
    out[k] = typeof defaults[k] === 'number' ? Number(v) : typeof defaults[k] === 'boolean' ? v !== 'false' : v;
  }
  return out;
}
