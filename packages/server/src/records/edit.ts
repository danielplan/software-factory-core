// Changes to the records worked out on a copy of them, then written in one
// go: the store checks them all together (store.ts), and refuses every one
// of them, with why, when they would break a rule. A refusal comes back as
// Refused, said plainly to whoever asked.

import { randomUUID } from "node:crypto";

import {
  type Kind,
  type RecordOf,
  type Records,
  type RecordsChange,
  RecordsRefused,
  type RecordStore,
} from "@software-factory/core";

import { Refused } from "../refused.ts";

type Keyed = { id: string };
// The kinds whose records have an id (not versions, tickets or outcomes).
type IdKind = {
  [K in Kind]: RecordOf<K> extends Keyed ? K : never;
}[Kind];

export class Edit {
  readonly records: Records;
  private readonly changed = new Map<IdKind, Set<string>>();
  private readonly removed = new Map<IdKind, Set<string>>();
  // Made in this edit, so not in the store yet.
  private readonly added = new Set<string>();

  constructor(store: RecordStore) {
    this.records = store.all();
  }

  find<K extends IdKind>(kind: K, id: string): RecordOf<K> | undefined {
    return (this.records[kind] as Keyed[]).find((r) => r.id === id) as
      RecordOf<K> | undefined;
  }

  // The record, or a refusal that says it is not there.
  get<K extends IdKind>(kind: K, id: string, what: string): RecordOf<K> {
    const record = this.find(kind, id);
    if (!record) throw new Refused(`There is no ${what} “${id}”.`);
    return record;
  }

  // A record changed in place, or a new one; written when saved.
  put<K extends IdKind>(kind: K, record: RecordOf<K>): RecordOf<K> {
    const list = this.records[kind] as Keyed[];
    const { id } = record as Keyed;
    const at = list.findIndex((r) => r.id === id);
    if (at === -1) {
      this.added.add(`${kind}/${id}`);
      list.push(record);
    } else list[at] = record;
    this.mark(this.changed, kind, id);
    return record;
  }

  remove(kind: IdKind, id: string): void {
    const list = this.records[kind] as Keyed[];
    const at = list.findIndex((r) => r.id === id);
    if (at === -1) return;
    list.splice(at, 1);
    this.changed.get(kind)?.delete(id);
    if (!this.added.delete(`${kind}/${id}`)) this.mark(this.removed, kind, id);
  }

  // Every change at once, checked as a whole.
  save(store: RecordStore): RecordsChange {
    try {
      return store.write((writer) => {
        for (const [kind, ids] of this.removed)
          for (const id of ids) writer.remove(kind, id);
        for (const [kind, ids] of this.changed)
          for (const id of ids) writer.put(kind, this.get(kind, id, kind));
      });
    } catch (error) {
      if (error instanceof RecordsRefused) throw new Refused(error.message);
      throw error;
    }
  }

  private mark(map: Map<IdKind, Set<string>>, kind: IdKind, id: string) {
    map.set(kind, (map.get(kind) ?? new Set()).add(id));
  }
}

// A new record's id: what it is, and a short random part.
export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
