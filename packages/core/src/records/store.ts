// The records of a product, in a local SQLite database (Node's own
// node:sqlite): one table per kind of record, each record a row of JSON under
// its key. Every write is checked against the records' rules (check.ts) in
// one transaction, and refused, with why, when it would break one that held
// before. Whoever subscribes hears which records changed.

import { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { checkRecords } from "./check.ts";
import {
  KINDS,
  keyOf,
  type Kind,
  RECORD_NAMES,
  RECORD_SCHEMAS,
  type RecordInput,
  type RecordOf,
  type Records,
} from "./schemas.ts";

// A write the records' rules do not allow, or a record that does not fit:
// each problem in a plain line.
export class RecordsRefused extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(problems.join(" · "));
    this.problems = problems;
  }
}

// Which records a write changed (put or removed), by kind.
export type RecordsChange = { kind: Kind; keys: string[] }[];

// What a write may do; the store checks it all once the write is done.
export type Writer = {
  put: <K extends Kind>(kind: K, record: RecordInput<K>) => RecordOf<K>;
  remove: (kind: Kind, key: string) => void;
};

// The version of the tables, so a later core can change them.
const TABLES_VERSION = 1;

export class RecordStore {
  private readonly db: DatabaseSync;
  private readonly listeners = new Set<(change: RecordsChange) => void>();

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  // The database in this file (made when there is none), or one in memory
  // (":memory:"); read only, an existing one is never changed.
  static open(file: string, readOnly = false): RecordStore {
    const db = new DatabaseSync(file, { readOnly });
    if (!readOnly) {
      for (const kind of KINDS)
        db.exec(
          `CREATE TABLE IF NOT EXISTS "${kind}" (key TEXT PRIMARY KEY, data TEXT NOT NULL) STRICT`,
        );
      db.exec(`PRAGMA user_version = ${String(TABLES_VERSION)}`);
    }
    return new RecordStore(db);
  }

  list<K extends Kind>(kind: K): RecordOf<K>[] {
    const rows = this.db
      .prepare(`SELECT key, data FROM "${kind}" ORDER BY rowid`)
      .all();
    return rows.map((row) => read(kind, String(row.key), String(row.data)));
  }

  get<K extends Kind>(kind: K, key: string): RecordOf<K> | null {
    const row = this.db
      .prepare(`SELECT data FROM "${kind}" WHERE key = ?`)
      .get(key);
    return row ? read(kind, key, String(row.data)) : null;
  }

  all(): Records {
    return Object.fromEntries(
      KINDS.map((kind) => [kind, this.list(kind)]),
    ) as Records;
  }

  isEmpty(): boolean {
    return KINDS.every(
      (kind) => !this.db.prepare(`SELECT 1 FROM "${kind}" LIMIT 1`).get(),
    );
  }

  // What breaks the records' rules now; nothing when they hold.
  check(): string[] {
    return checkRecords(this.all());
  }

  put<K extends Kind>(kind: K, record: RecordInput<K>): RecordOf<K> {
    let saved: RecordOf<K> | undefined;
    this.write((writer) => {
      saved = writer.put(kind, record);
    });
    return saved as RecordOf<K>;
  }

  remove(kind: Kind, key: string): void {
    this.write((writer) => {
      writer.remove(kind, key);
    });
  }

  // Every record of a seed, in one write.
  fill(records: Records): void {
    this.write((writer) => {
      for (const kind of KINDS)
        for (const record of records[kind]) writer.put(kind, record);
    });
  }

  // Several changes as one: all of them are made, or, when they would break
  // a rule that held before, none.
  write(changes: (writer: Writer) => void): RecordsChange {
    const before = new Set(this.check());
    const changed = new Map<Kind, Set<string>>();
    const touched = (kind: Kind, key: string) => {
      changed.set(kind, (changed.get(kind) ?? new Set()).add(key));
    };
    this.db.exec("BEGIN");
    try {
      changes(this.writer(touched));
      const broken = this.check().filter((problem) => !before.has(problem));
      if (broken.length > 0) throw new RecordsRefused(broken);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    const change = [...changed].map(([kind, keys]) => ({
      kind,
      keys: [...keys],
    }));
    for (const listener of this.listeners) listener(change);
    return change;
  }

  subscribe(listener: (change: RecordsChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
    if (this.db.isOpen) this.db.close();
  }

  private writer(touched: (kind: Kind, key: string) => void): Writer {
    return {
      put: (kind, record) => {
        const parsed = RECORD_SCHEMAS[kind].safeParse(record);
        if (!parsed.success)
          throw new RecordsRefused([
            `This ${nameOf(kind)} does not fit: ${z.prettifyError(parsed.error)}`,
          ]);
        const saved = parsed.data as RecordOf<typeof kind>;
        const key = keyOf(saved);
        this.db
          .prepare(
            `INSERT INTO "${kind}" (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data`,
          )
          .run(key, JSON.stringify(saved));
        touched(kind, key);
        return saved;
      },
      remove: (kind, key) => {
        const gone = this.db
          .prepare(`DELETE FROM "${kind}" WHERE key = ?`)
          .run(key);
        if (gone.changes === 0)
          throw new RecordsRefused([`There is no ${nameOf(kind)} “${key}”.`]);
        touched(kind, key);
      },
    };
  }
}

// A row read back, as its kind's record; one that no longer fits is said.
function read<K extends Kind>(kind: K, key: string, data: string): RecordOf<K> {
  const parsed = RECORD_SCHEMAS[kind].safeParse(JSON.parse(data));
  if (!parsed.success)
    throw new RecordsRefused([
      `The ${nameOf(kind)} “${key}” in the database does not fit: ${z.prettifyError(parsed.error)}`,
    ]);
  return parsed.data as RecordOf<K>;
}

function nameOf(kind: Kind): string {
  return RECORD_NAMES[kind].toLowerCase();
}
