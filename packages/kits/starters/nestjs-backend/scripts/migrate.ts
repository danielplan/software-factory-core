// `npm run migrate` (and the start of `npm start`): makes the database in
// DATABASE_URL (or DATABASE_NAME on its server) when it is missing, and
// applies the updates in drizzle/.
import { withDatabaseName } from "../src/database/database-url.ts";
import { applyUpdates, createIfMissing } from "./database.ts";

const { DATABASE_URL, DATABASE_NAME } = process.env;
if (!DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL in .env (see .env.example) before migrating.",
  );
const url = withDatabaseName(DATABASE_URL, DATABASE_NAME);
try {
  if (await createIfMissing(url)) console.log("Database created.");
  console.log(`Database updates applied: ${await applyUpdates(url)}.`);
} catch (error) {
  console.error(
    `The database could not be prepared: ${error instanceof Error ? error.message : String(error)}`,
  );
  console.error(
    "Is the database server running? `docker compose up -d --wait` starts the local one (README).",
  );
  process.exitCode = 1;
}
