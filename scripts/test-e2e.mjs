import { spawnSync } from 'node:child_process';
const mode = process.argv[2] || 'live';
if (!['demo', 'live', 'local'].includes(mode)) throw new Error('Usa demo, live o local.');
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  env: { ...process.env, PWA_TEST_MODE: mode },
  stdio: 'inherit',
});
process.exit(result.status || 0);
