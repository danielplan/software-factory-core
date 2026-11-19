// This backend's own database, on the PostgreSQL server DATABASE_URL names:
// made when it is missing, then given the updates in drizzle/. Used by `npm run migrate` and the
// database tests.
import { existsSync } from "node:fs";
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
