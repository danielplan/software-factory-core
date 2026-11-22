// This backend's own database, on the PostgreSQL server DATABASE_URL names:
// made when it is missing, then given the updates in drizzle/. Used by `npm run migrate`,
// `npm start` and the database tests. The tests of each working copy get a database of
// their own (testDatabaseFor), so copies running side by side never share one.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const migrationsFolder = join(import.meta.dirname, "..", "drizzle");

/** The database an address names, and the same server's `postgres` database. */
export function serverAndDatabase(url: string) {
  const server = new URL(url);
  const database = decodeURIComponent(server.pathname.slice(1));
  if (!database) throw new Error("DATABASE_URL must name a database.");
  server.pathname = "/postgres";
  return { server: server.toString(), database };
}

/** Creates the database on its server when it does not exist yet. */
export async function createIfMissing(url: string): Promise<boolean> {
  const { server, database } = serverAndDatabase(url);
  const client = new pg.Client({ connectionString: server });
  await client.connect();
  try {
    const found = await client.query(
      "select 1 from pg_database where datname = $1",
      [database],
    );
    if (found.rowCount) return false;
    await client.query(`create database ${client.escapeIdentifier(database)}`);
    return true;
  } finally {
    await client.end();
  }
}

/** Applies drizzle/'s updates; a backend without tables yet has none. */
export async function applyUpdates(url: string): Promise<number> {
  if (!existsSync(join(migrationsFolder, "meta", "_journal.json"))) return 0;
  const pool = new pg.Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
    const applied = await pool.query<{ count: string }>(
      "select count(*) from drizzle.__drizzle_migrations",
    );
    return Number(applied.rows[0]?.count ?? 0);
  } finally {
    await pool.end();
  }
}

/** What a working copy's test database says about itself, so it can be found again. */
const NOTE = "test database of the working copy ";

/**
 * The test database of the working copy in `folder`: the name in `url` with a
 * short mark of the folder, so every copy of the code tests on its own.
 */
export function testDatabaseFor(url: string, folder: string) {
  const { database } = serverAndDatabase(url);
  const mark = createHash("sha256").update(folder).digest("hex").slice(0, 8);
  const name = `${database}-${mark}`;
  const address = new URL(url);
  address.pathname = `/${encodeURIComponent(name)}`;
  return {
    name,
    url: address.toString(),
    note: `${NOTE}${hostname()}:${folder}`,
  };
}

/**
 * The test databases to drop: made by a working copy on this computer whose
 * folder is gone. Databases without the note, or made on another computer,
 * are never touched.
 */
export function leftBehind(
  databases: { name: string; note: string | null }[],
  exists: (folder: string) => boolean,
): string[] {
  const here = `${NOTE}${hostname()}:`;
  return databases
    .filter(({ note }) => note?.startsWith(here))
    .filter(({ note }) => !exists((note ?? "").slice(here.length)))
    .map(({ name }) => name);
}

/** Makes this working copy's test database when missing, and drops the ones left behind. */
export async function prepareTestDatabase(url: string, folder: string) {
  const own = testDatabaseFor(url, folder);
  const { server, database } = serverAndDatabase(url);
  const client = new pg.Client({ connectionString: server });
  await client.connect();
  try {
    const found = await client.query<{ name: string; note: string | null }>(
      "select datname as name, shobj_description(oid, 'pg_database') as note from pg_database where datname like $1",
      [`${database}-%`],
    );
    for (const name of leftBehind(found.rows, existsSync))
      await client.query(
        `drop database if exists ${client.escapeIdentifier(name)} with (force)`,
      );
    if (!found.rows.some((row) => row.name === own.name))
      await client.query(
        `create database ${client.escapeIdentifier(own.name)}`,
      );
    await client.query(
      `comment on database ${client.escapeIdentifier(own.name)} is ${client.escapeLiteral(own.note)}`,
    );
  } finally {
    await client.end();
  }
  return own.url;
}
