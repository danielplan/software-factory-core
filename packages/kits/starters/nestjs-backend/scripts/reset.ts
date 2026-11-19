// `npm run db:reset`: empties this backend's own database and builds it again from
// drizzle/. Its data is lost: use it only for a database built before its
// migration history, or for a fresh start while developing.
import pg from "pg";
import { applyUpdates } from "./database.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env before resetting.");
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query("drop schema if exists drizzle cascade");
  await client.query("drop schema public cascade");
  await client.query("create schema public");
  await client.end();
  console.log(`Database rebuilt, updates applied: ${await applyUpdates(url)}.`);
} catch (error) {
  await client.end().catch(() => undefined);
  console.error(
    `The database could not be rebuilt: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
