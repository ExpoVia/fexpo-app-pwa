import { spawnSync } from 'node:child_process';
const mode = process.argv[2];
if (!['demo', 'live', 'local'].includes(mode)) throw new Error('Usa demo, live o local.');
const env = { ...process.env, VITE_DATA_MODE: mode };
for (const args of [
  ['node_modules/typescript/bin/tsc', '-b'],
  ['node_modules/vite/bin/vite.js', 'build'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
