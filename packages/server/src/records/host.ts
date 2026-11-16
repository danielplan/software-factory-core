// The project's records (its factory's kobble.db), for the server: opened
// the first time they are asked for once the project has its factory. In
// setup there is no factory, so no records yet. Whoever listens hears which
// records changed.

import { join } from "node:path";

import {
  FACTORY_FOLDER,
  hasFactory,
  openRecords,
  type RecordsChange,
  RecordsRefused,
  type RecordStore,
} from "@software-factory/core";

import { Refused } from "../refused.ts";

export class RecordsHost {
  private readonly root: string;
  private store: RecordStore | null = null;
  private readonly listeners = new Set<(change: RecordsChange) => void>();

  constructor(project: string) {
    this.root = join(project, FACTORY_FOLDER);
  }

  // The records, opened when they are not yet; refused, with why, before
  // the factory is made or when its seed does not fit.
  orRefuse(): RecordStore {
    if (this.store) return this.store;
    if (!hasFactory(this.root))
      throw new Refused("There is no factory yet: its records come with it.");
    try {
      this.store = openRecords(this.root);
    } catch (error) {
      if (!(error instanceof RecordsRefused)) throw error;
      throw new Refused(`The records cannot be opened: ${error.message}`);
    }
    this.store.subscribe((change) => {
      for (const listener of this.listeners) listener(change);
    });
    return this.store;
  }

  subscribe(listener: (change: RecordsChange) => void): void {
    this.listeners.add(listener);
  }

  close(): void {
    this.store?.close();
    this.store = null;
  }
}
