import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { applyUpdates } from "../scripts/database.ts";
import * as schema from "../src/database/schema.js";
import { seed, situationsIn, tablesOf } from "./world.js";

// Each situation of the made-up world, written into the test database in a
// transaction that is then undone: the database's own checks (types, unique
// keys, constraints) hold for it too. `npm run test:integration` switches it on.
const url =
  process.env.TEST_DATABASE === "1" ? process.env.DATABASE_URL : undefined;

class Undo extends Error {}

describe.runIf(url)("the made-up world in the real database", () => {
  test.each(situationsIn())("$key can be written", async ({ situation }) => {
    await applyUpdates(url ?? "");
    const pool = new pg.Pool({ connectionString: url });
    onTestFinished(() => pool.end());
    const written = drizzle(pool)
      .transaction(async (tx) => {
        await seed(tx, situation, tablesOf(schema));
        throw new Undo();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Undo)) throw error;
      });
    await assert.doesNotReject(written);
  });
});
