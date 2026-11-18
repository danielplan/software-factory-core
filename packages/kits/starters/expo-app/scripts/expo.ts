import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** the app's folder. */
export const root = join(import.meta.dirname, '..');

/**
 * Runs Expo's command line (`npx expo …`) in the app's folder with extra
 * environment variables, showing its output, and returns its exit code. On
 * Windows npx is a .cmd file, which only starts through the shell.
 */
export function runExpo(args: string[], env: Record<string, string>) {
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? 'npx.cmd' : 'npx', ['expo', ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: windows,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
