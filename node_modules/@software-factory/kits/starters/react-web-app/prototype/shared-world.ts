import { pretendBackend, type PretendBackend } from "./pretend-backend.ts";
import type { Data } from "./situations.ts";
import { worldLink, type World } from "./world.ts";

// The pretend backend on the factory's shared world: its data is the
// world's tables, its changes go to the world, and every two seconds it
// looks for others' changes; then `refresh` makes the screens load again.
// The app checks what it is given as it checks the real backend, so a world
// the app cannot read shows as an error, not as made-up screens.

// The app's data in the world's tables: the items are the "items" table.
export function fromWorld(world: World): Data {
  return { items: (world.tables.items ?? []) as Data["items"] };
}

export async function sharedWorldBackend(
  url: string,
  refresh: () => void,
): Promise<{ backend: PretendBackend; situation: string; stop: () => void }> {
  const link = worldLink(url);
  const world = await link.read();
  const backend = pretendBackend(fromWorld(world), link);
  const stop = link.follow((next) => {
    backend.replace(fromWorld(next));
    refresh();
  });
  return { backend, situation: world.situation, stop };
}
