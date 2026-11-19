import assert from "node:assert/strict";
import { applyUpdates, createIfMissing } from "../scripts/database.ts";
import { buildTestApp, inject } from "./helpers.js";

// The real database: `npm run test:integration` (with .env.test) switches it on.
const url =
  process.env.TEST_DATABASE === "1" ? process.env.DATABASE_URL : undefined;

describe.runIf(url)("this backend's own database on its server", () => {
  test("is made when missing, takes its updates, and the backend answers", async () => {
    const address = url ?? "";
    await createIfMissing(address);
    assert.equal(await createIfMissing(address), false);
    await applyUpdates(address);
    // The real pool, from the settings, on this backend's own database.
    const app = await buildTestApp();
    onTestFinished(() => app.close());
    assert.equal((await inject(app, "/health")).statusCode, 200);
  });
});
