/**
 * npm run prototype -- --base <url path> --out <folder>
 *
 * Builds the app's prototype for the browser: the real app against the pretend
 * backend (prototype/), as static files in <folder>, to be served at
 * <url path> (for example /prototypes/new-phone-app/v1), with
 * index.html for any path the files do not have. `?situation=<key>` in the
 * page's address picks a situation (prototype/situations.ts).
 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pretendApi } from '../prototype/pretend-backend.ts';
import { runExpo } from './expo.ts';

const { values } = parseArgs({
  options: { base: { type: 'string' }, out: { type: 'string' } },
});
if (!values.base || !values.out) {
  console.error('Usage: npm run prototype -- --base <url path> --out <folder>');
  process.exit(2);
}

// "/prototypes/v1/" and "prototypes/v1" both mean "/prototypes/v1".
const base = `/${values.base.split('/').filter(Boolean).join('/')}`;
// npm runs the script in the app's folder; a relative folder is the caller's.
const out = resolve(process.env.INIT_CWD ?? process.cwd(), values.out);

const status = runExpo(
  ['export', '--platform', 'web', '--output-dir', out, '--clear'],
  {
    EXPO_PUBLIC_PROTOTYPE: '1',
    EXPO_PUBLIC_API_URL: pretendApi,
    PROTOTYPE_BASE_URL: base === '/' ? '' : base,
    EXPO_PUBLIC_FACTORY_WORLD_URL: process.env.FACTORY_WORLD_URL ?? '',
  },
);
process.exit(status);
