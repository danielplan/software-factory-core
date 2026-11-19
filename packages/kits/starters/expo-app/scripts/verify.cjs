// npm run verify: every check of the app, in order, stopping at the first that
// fails.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run with npm run verify');

const checks = [
  'format:check',
  'lint',
  'typecheck',
  'deadcode',
  'duplicates',
  'test:coverage',
  // A normal build of the app, which must contain no prototype code.
  'check:prototypes',
  // Expo's own checks: package versions that match the Expo SDK, and the
  // project's configuration.
  'deps:check',
  'doctor',
];

for (const check of checks) {
  const result = spawnSync(process.execPath, [npmCli, 'run', check], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
