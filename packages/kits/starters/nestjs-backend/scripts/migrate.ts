// `npm run migrate` (and `test-env:migrate`): makes the database in DATABASE_URL
// when it is missing, on its server, and applies the updates in drizzle/.
import { applyUpdates, createIfMissing } from "./database.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env before migrating.");
try {
  if (await createIfMissing(url)) console.log("Database created.");
  console.log(`Database updates applied: ${await applyUpdates(url)}.`);
} catch (error) {
  console.error(
    `The database could not be prepared: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
