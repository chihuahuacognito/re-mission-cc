// Parse gate: `node --check` every src/**/*.js. Replaces the old `vite build`
// compile check (catches syntax/parse errors without executing browser code).
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith('.js')) execFileSync(process.execPath, ['--check', p], { stdio: 'inherit' });
  }
}
walk('src');
console.log('parse ok');
