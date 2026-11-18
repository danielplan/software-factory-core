// Starts the prototype (see src/lib/prototype-mode.ts and README.md,
// "Prototype"): the pretend backend with a situation's data, or with the
// factory's shared world when one is given, and the message that tells the
// frame around the page what it shows.
// First, so MSW finds what it needs when it loads.
import './polyfills';
import {
  replaceItems,
  saveChangesWith,
  setData,
  type Item,
} from './pretend-backend';
import {
  announce,
  chosenSituation,
  followReloads,
  forgetStoredData,
  reportScreens,
  startPretendBackend,
} from './platform';
import { situations } from './situations';
import { worldLink, type World } from './world';

/** The app's name for the factory. */
const app = 'new-phone-app';

/** What the page tells the frame around it: its situations and the one shown. */
export const announcement = (current: string, world = false) => ({
  type: 'factory-prototype',
  app,
  situations: situations.map((row) => ({ key: row.key, name: row.name })),
  current,
  world,
});

// The world's rows are given to the app as they are: the app checks them
// with its own schema when it reads them, as it would the real backend's.
const itemsOf = (world: World) => (world.tables.items ?? []) as Item[];

/** Fills the pretend backend from the shared world and follows its changes. */
async function joinWorld(url: string, changed: () => void) {
  const link = worldLink(url);
  const world = await link.read();
  setData({ items: itemsOf(world) });
  saveChangesWith(link.write);
  const stop = link.follow((next) => {
    replaceItems(itemsOf(next));
    changed();
  });
  return { current: world.situation, stop };
}

/**
 * Starts the prototype before the app shows anything: picks the situation
 * (or joins the shared world), fills the pretend backend, starts it and
 * tells the frame around the page which situations there are. Nothing is
 * kept from a previous start. `changed` asks the app to read its data again
 * when the shared world changes. Gives back how to stop following the
 * shared world (nothing to stop without one).
 */
export async function startPrototype(
  changed: () => void = () => undefined,
): Promise<() => void> {
  const [first] = situations;
  if (!first) throw new Error('prototype/situations.ts lists no situation.');
  forgetStoredData();
  followReloads();
  reportScreens();
  const worldUrl = process.env.EXPO_PUBLIC_FACTORY_WORLD_URL;
  if (worldUrl) {
    const { current, stop } = await joinWorld(worldUrl, changed);
    await startPretendBackend();
    announce(announcement(current, true));
    return stop;
  }
  saveChangesWith(null);
  const key = chosenSituation();
  const situation = situations.find((row) => row.key === key) ?? first;
  setData(situation.data());
  await startPretendBackend();
  announce(announcement(situation.key));
  return () => undefined;
}
