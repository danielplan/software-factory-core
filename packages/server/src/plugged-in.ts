// What the app plugs into the session: the installed extensions' plugs
// (the Factory's board work among them, for the page's state), and those
// who follow the factory opening (again, when its files change) and
// closing.

import type { PlugBoard, PlugName, Plugs } from "./plugs/index.ts";

// Hears the factory open and close.
type Watcher = { opened: (root: string) => void; closed: () => void };

export class PluggedIn {
  private plugs: PlugBoard = () => null;
  private readonly watchers = new Set<Watcher>();
  // The factory's folder while one is open.
  private root: string | null = null;

  // The installed extensions' plugs, from the app that serves them.
  plugInto(plugs: PlugBoard): void {
    this.plugs = plugs;
  }

  // An installed extension's plug, or null.
  plug<N extends PlugName>(name: N): Plugs[N] | null {
    return this.plugs(name);
  }

  // Tells the watcher when the factory opens (at once, when it is open)
  // and closes; answers how to stop.
  watch(watcher: Watcher): () => void {
    this.watchers.add(watcher);
    if (this.root) watcher.opened(this.root);
    return () => {
      this.watchers.delete(watcher);
    };
  }

  opened(root: string): void {
    this.root = root;
    for (const watcher of this.watchers) watcher.opened(root);
  }

  closed(): void {
    this.root = null;
    for (const watcher of this.watchers) watcher.closed();
  }
}
