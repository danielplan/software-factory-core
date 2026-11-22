import assert from "node:assert/strict";
import { validateEnvironment } from "../src/common/environment.js";
import { buildTestApp, inject } from "./helpers.js";

const answering = { query: async () => ({ rows: [] }), end: async () => {} };

test("health answers once the database answers, outside /api", async () => {
  const app = await buildTestApp(answering);
  onTestFinished(() => app.close());
  const response = await inject(app, "/health");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json<Record<string, unknown>>(), { status: "ok" });
  assert.equal((await inject(app, "/api/health")).statusCode, 404);
});

test("health fails while the database does not answer", async () => {
  const app = await buildTestApp({
    query: async () => {
      throw new Error("no server");
    },
    end: async () => {},
  });
  onTestFinished(() => app.close());
  const response = await inject(app, "/health");
  assert.equal(response.statusCode, 500);
  // A server failure hides its details.
  assert.deepEqual(response.json<Record<string, unknown>>(), {
    error: "server_error",
    message: "The server could not complete the request.",
  });
});

test("unknown paths answer not_found", async () => {
  const app = await buildTestApp(answering);
  onTestFinished(() => app.close());
  const response = await inject(app, "/api/nothing");
  assert.equal(response.statusCode, 404);
  assert.equal(response.json<{ error: string }>().error, "not_found");
});

test("the settings are checked at start-up, with defaults for the address", () => {
  const settings = validateEnvironment({
    DATABASE_URL: "postgres://u:p@127.0.0.1:5432/my-shop",
  });
  assert.equal(settings.PORT, 3000);
  assert.equal(settings.HOST, "127.0.0.1");
  assert.equal(settings.DATABASE_URL, "postgres://u:p@127.0.0.1:5432/my-shop");
  assert.equal(
    validateEnvironment({ DATABASE_URL: "postgres://h/db", PORT: "4321" }).PORT,
    4321,
  );
  assert.throws(() => validateEnvironment({}), /Check \.env/);
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: "mysql://elsewhere/db" }),
    /Check \.env/,
  );
});

test("DATABASE_NAME names another database on the same server", () => {
  const settings = validateEnvironment({
    DATABASE_URL: "postgres://u:p@127.0.0.1:5432/my-shop",
    DATABASE_NAME: "my-shop-copy-3001",
  });
  assert.equal(
    settings.DATABASE_URL,
    "postgres://u:p@127.0.0.1:5432/my-shop-copy-3001",
  );
  assert.equal(
    validateEnvironment({ DATABASE_URL: "postgres://h/db", DATABASE_NAME: "" })
      .DATABASE_URL,
    "postgres://h/db",
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgres://h/db",
        DATABASE_NAME: "a/b",
      }),
    /Check \.env/,
  );
});
