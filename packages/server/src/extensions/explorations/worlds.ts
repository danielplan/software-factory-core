// Keeps each exploration's made-up world (core's kobble/world.ts) in its
// folder (world.json, through the store), so it survives a restart: started
// from the first situation the first time it is asked for (or from a
// persona's, when a persona's test or prototype starts it), changed by the
// prototypes (world-route.ts) and by the kobold's world tools
// (world-tools.ts), and started again on request. The prototypes ask for
// it again every few seconds, so every tab and device sees each change.

import {
  changeWorld,
  findProducts,
  type KobbleStore,
  type SituationName,
  Situations,
  startWorld,
  type World,
  type WorldChange,
  WorldRefused,
} from "@software-factory/core";

type Options = {
  // The factory's folder: its products name their worlds.
  root: string;
  store: () => KobbleStore;
  now?: () => Date;
};

export class ExplorationWorlds {
  private readonly options: Options;
  private readonly situations: Situations;

  constructor(options: Options) {
    this.options = options;
    this.situations = new Situations(() => findProducts(options.root).products);
  }

  // Whether any product has a made-up world to share.
  offered(): boolean {
    return this.situations.first() !== null;
  }

  names(): SituationName[] {
    return this.situations.names();
  }

  // The world now; the first situation's the first time.
  world(id: string): World {
    const saved = this.options.store().world(id);
    if (saved) return saved;
    const first = this.situations.first();
    if (!first)
      throw new WorldRefused(
        "No product has a made-up world yet: a product names its folder of situations as its “world” in product.json.",
        "missing",
      );
    return this.start(id, first);
  }

  // Starts the world again from a situation.
  start(id: string, key: string): World {
    const situation = this.situations.get(key);
    const now = this.options.now?.() ?? new Date();
    return this.options.store().saveWorld(id, startWorld(key, situation, now));
  }

  // Back to the start of the situation it is in.
  reset(id: string): World {
    return this.start(id, this.world(id).situation);
  }

  // Starts it from the persona's situation, when the persona names one and
  // a product has a world.
  startFor(id: string, persona: string | undefined): void {
    const named = persona
      ? this.options.store().get("personas", persona)?.situation
      : undefined;
    if (named && this.offered()) this.start(id, named);
  }

  // Changes made on the version seen (none: whatever it is now).
  change(id: string, seen: number | null, changes: WorldChange[]): World {
    const changed = changeWorld(this.world(id), seen, changes);
    return this.options.store().saveWorld(id, changed);
  }
}
