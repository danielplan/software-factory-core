// Keeping the signals in step with the live app: a sync when the server
// starts (when the live app is set up), then every 30 minutes while it runs,
// and whenever someone presses Sync now. One sync at a time: pressing it
// during one waits for that one. When a sync fails the signals stay as they
// were and the problem is shown in plain words until the next one works.

import {
  KobbleRefused,
  type KobbleSignal,
  type KobbleStore,
  takeInEvents,
} from "@software-factory/core";

import { LiveProblem, type LiveSettings, readExport } from "./live-source.ts";

export const SYNC_EVERY = 30 * 60 * 1000;

export type SyncView = {
  // Whether the live app is set up (KOBBLE_LIVE_URL).
  connected: boolean;
  // Where it reads from (never the token).
  address: string | null;
  // When it was last read, and when it reads next, as ISO times.
  last: string | null;
  next: string | null;
  problem: string | null;
};

type SyncOptions = {
  // The records, or null before the factory is made.
  store: () => KobbleStore | null;
  settings: () => LiveSettings;
  // A sync ran, with the new signals it brought (none when it failed).
  onSynced: (added: KobbleSignal[]) => void;
  now?: () => Date;
};

export class LiveSync {
  private running: Promise<KobbleSignal[]> | null = null;
  private problem: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private nextAt: number | null = null;
  private readonly options: SyncOptions;

  constructor(options: SyncOptions) {
    this.options = options;
  }

  // The first sync, then one every 30 minutes; the timer never keeps the
  // server running on its own.
  start(): void {
    this.close();
    void this.sync();
    this.nextAt = this.now() + SYNC_EVERY;
    this.timer = setInterval(() => {
      this.nextAt = this.now() + SYNC_EVERY;
      void this.sync();
    }, SYNC_EVERY);
    this.timer.unref();
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.nextAt = null;
  }

  private now(): number {
    return (this.options.now ?? (() => new Date()))().getTime();
  }

  // The new signals of this sync (none when it is off or failed).
  sync(): Promise<KobbleSignal[]> {
    this.running ??= this.once().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  view(): SyncView {
    const { url } = this.options.settings();
    let last: string | null = null;
    try {
      last = this.options.store()?.sync().last ?? null;
    } catch {
      // A sync.json that does not fit reads as never synced.
    }
    return {
      connected: url !== null,
      address: url,
      last,
      next:
        url !== null && this.nextAt !== null
          ? new Date(this.nextAt).toISOString()
          : null,
      problem: this.problem,
    };
  }

  private async once(): Promise<KobbleSignal[]> {
    const { url, token } = this.options.settings();
    const store = this.options.store();
    if (url === null || store === null) {
      this.problem = null;
      return [];
    }
    const added = await this.read(store, { url, token });
    this.options.onSynced(added);
    return added;
  }

  private async read(
    store: KobbleStore,
    settings: { url: string; token: string | null },
  ): Promise<KobbleSignal[]> {
    try {
      const since = store.sync().cursor;
      const live = await readExport(settings, since);
      const added = takeInEvents(store, live.events);
      const now = (this.options.now ?? (() => new Date()))();
      store.saveSync({ last: now.toISOString(), cursor: live.cursor });
      this.problem = null;
      return added;
    } catch (error) {
      this.problem =
        error instanceof LiveProblem || error instanceof KobbleRefused
          ? error.message
          : `The sync stopped: ${String(error)}`;
      return [];
    }
  }
}
