import assert from "node:assert/strict";
import { validateEnvironment } from "../src/common/environment.js";
import { buildTestApp, inject } from "./helpers.js";

const answering = { query: async () => ({ rows: [] }), end: async () => {} };

test("health answers once the database answers", async () => {
  const app = await buildTestApp(answering);
  onTestFinished(() => app.close());
  const response = await inject(app, "/health");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json<Record<string, unknown>>(), { status: "ok" });
});

test("health fails while the database does not answer", async () => {
  const app = await buildTestApp({
    query: async () => {
      throw new Error("no server");
    },
    end: async () => {},
  });
  onTestFinished(() => app.close());
  assert.equal((await inject(app, "/health")).statusCode, 500);
});

test("unknown paths answer 404", async () => {
  const app = await buildTestApp(answering);
  onTestFinished(() => app.close());
  assert.equal((await inject(app, "/nothing")).statusCode, 404);
});

test("the settings are checked at start-up, with defaults for the address", () => {
  const settings = validateEnvironment({
    DATABASE_URL: "postgres://u:p@127.0.0.1:5432/my-shop",
  });
  assert.equal(settings.PORT, 3000);
  assert.equal(
    validateEnvironment({ DATABASE_URL: "postgres://h/db", PORT: "4321" }).PORT,
    4321,
  );
  assert.equal(settings.HOST, "127.0.0.1");
  assert.match(
    validateEnvironment({}).DATABASE_URL,
    /^postgres:\/\/127\.0\.0\.1/,
  );
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: "mysql://elsewhere/db" }),
    /Check \.env/,
  );
});
