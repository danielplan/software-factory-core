/**
 * npm run prototype:live -- --port <port>
 *
 * the app's prototype running live: Expo's web development server with the
 * pretend backend (prototype/), at http://localhost:<port>/. The factory
 * shows it while its prototype maker changes the screens, and each change
 * shows within seconds. FACTORY_WORLD_URL, when set, gives it the factory's
 * shared made-up world (README.md, "Shared world").
 */
import { parseArgs } from 'node:util';
import { pretendApi } from '../prototype/pretend-backend.ts';
import { runExpo } from './expo.ts';

const { values } = parseArgs({ options: { port: { type: 'string' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port <= 0) {
  console.error('Usage: npm run prototype:live -- --port <port>');
  process.exit(2);
}

const status = runExpo(
  ['start', '--web', '--port', String(port), '--localhost'],
  {
    EXPO_PUBLIC_PROTOTYPE: '1',
    EXPO_PUBLIC_API_URL: pretendApi,
    EXPO_PUBLIC_FACTORY_WORLD_URL: process.env.FACTORY_WORLD_URL ?? '',
    BROWSER: 'none',
  },
);
process.exit(status);
