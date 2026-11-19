/**
 * npm run prototype:phone [-- --situation <key>] [Expo's own options]
 *
 * Starts Expo for Expo Go with the app's prototype: the real app against the
 * pretend backend (prototype/), in one situation (prototype/situations.ts;
 * the first one when none is named). Open it in Expo Go as with `npm start`.
 * Other options go to `expo start`, for example `--ios` or `--port 8090`.
 */
import { pretendApi } from '../prototype/pretend-backend.ts';
import { runExpo } from './expo.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--situation');
const situation = at === -1 ? '' : (args[at + 1] ?? '');
const expoOptions = at === -1 ? args : args.toSpliced(at, 2);

const status = runExpo(['start', '--clear', ...expoOptions], {
  EXPO_PUBLIC_PROTOTYPE: '1',
  EXPO_PUBLIC_API_URL: pretendApi,
  EXPO_PUBLIC_PROTOTYPE_SITUATION: situation,
  EXPO_PUBLIC_FACTORY_WORLD_URL: process.env.FACTORY_WORLD_URL ?? '',
});
process.exit(status);
