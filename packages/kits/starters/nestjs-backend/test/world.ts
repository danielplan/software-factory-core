import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { getTableColumns, is } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

// The made-up world (prototype-world/): the situations the factory's
// prototypes share, written as this database's own tables, one
// `<key>.json` per situation. Kept true to the schema by
// test/prototype-world.spec.ts, and written into the test database by
// test/prototype-world.integration.spec.ts.

export type Row = Record<string, unknown>;

export type Situation = {
  name: string;
  about: string;
  clock: string;
  signed_in: Record<string, string>;
  tables: Record<string, Row[]>;
};

export const worldFolder = join(import.meta.dirname, "..", "prototype-world");

/** The situations in the folder, by key (the file's name), in key order. */
export function situationsIn(folder = worldFolder) {
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      key: basename(name, ".json"),
      situation: JSON.parse(
        readFileSync(join(folder, name), "utf8"),
      ) as Situation,
    }));
}

/** The tables a schema module exports. */
export function tablesOf(schema: Record<string, unknown>): PgTable[] {
  return Object.values(schema).filter((value): value is PgTable =>
    is(value, PgTable),
  );
}

const nameOf = (table: PgTable) => getTableConfig(table).name;
const missing = (value: unknown) => value === null || value === undefined;

function rowProblems(table: PgTable, rows: Row[]): string[] {
  const name = nameOf(table);
  const columns = Object.values(getTableColumns(table));
  const known = new Set(columns.map((column) => column.name));
  const required = columns.filter(
    (column) => column.notNull && !column.hasDefault,
  );
  return rows.flatMap((row, index) => [
    ...Object.keys(row)
      .filter((column) => !known.has(column))
      .map((column) => `${name}[${index}] has no column ${column}`),
    ...required
      .filter((column) => missing(row[column.name]))
      .map((column) => `${name}[${index}] needs ${column.name}`),
  ]);
}

function referenceProblems(table: PgTable, tables: Situation["tables"]) {
  const name = nameOf(table);
  return getTableConfig(table).foreignKeys.flatMap((key) => {
    const { columns, foreignTable, foreignColumns } = key.reference();
    const target = nameOf(foreignTable);
    const there = new Set(
      (tables[target] ?? []).map((row) =>
        JSON.stringify(foreignColumns.map((column) => row[column.name])),
      ),
    );
    return (tables[name] ?? []).flatMap((row, index) => {
      const values = columns.map((column) => row[column.name]);
      if (values.some(missing)) return [];
      return there.has(JSON.stringify(values))
        ? []
        : [`${name}[${index}] points at a row ${target} does not have`];
    });
  });
}

/**
 * What keeps a situation from fitting the database: a table missing or one the
 * database does not have, a column it does not have, a required value left
 * out, a reference to a row that is not there.
 */
export function problemsIn(situation: Situation, tables: PgTable[]): string[] {
  const names = new Set(tables.map(nameOf));
  return [
    ...[...names]
      .filter((name) => !(name in situation.tables))
      .map((name) => `there is no table ${name}`),
    ...Object.keys(situation.tables)
      .filter((name) => !names.has(name))
      .map((name) => `the database has no table ${name}`),
    ...tables.flatMap((table) =>
      rowProblems(table, situation.tables[nameOf(table)] ?? []),
    ),
    ...tables.flatMap((table) => referenceProblems(table, situation.tables)),
  ];
}

/** The tables in an order where each comes after the tables it points at. */
export function insertOrder(tables: PgTable[]): PgTable[] {
  const ordered: PgTable[] = [];
  const place = (table: PgTable, path: Set<PgTable>) => {
    if (ordered.includes(table) || path.has(table)) return;
    path.add(table);
    for (const key of getTableConfig(table).foreignKeys) {
      const target = key.reference().foreignTable;
      if (tables.includes(target)) place(target, path);
    }
    ordered.push(table);
  };
  for (const table of tables) place(table, new Set());
  return ordered;
}

/** A row as Drizzle takes it: its keys, and dates as dates. */
export function asValues(table: PgTable, row: Row): Row {
  return Object.fromEntries(
    Object.entries(getTableColumns(table)).flatMap(([key, column]) => {
      if (!(column.name in row)) return [];
      const value = row[column.name];
      return [
        [
          key,
          column.dataType === "date" && typeof value === "string"
            ? new Date(value)
            : value,
        ],
      ];
    }),
  );
}

/** Writes a situation's rows into the database, each table after the ones it points at. */
export async function seed(
  db: Pick<NodePgDatabase, "insert">,
  situation: Situation,
  tables: PgTable[],
) {
  for (const table of insertOrder(tables)) {
    const rows = situation.tables[nameOf(table)] ?? [];
    if (rows.length > 0)
      await db.insert(table).values(rows.map((row) => asValues(table, row)));
  }
}
