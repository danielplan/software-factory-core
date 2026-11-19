import assert from "node:assert/strict";
import { serverAndDatabase } from "../scripts/database.ts";

test("the database is made on the same server as the address names", () => {
  assert.deepEqual(
    serverAndDatabase("postgres://u:p@127.0.0.1:5432/my-shop-test"),
    {
      server: "postgres://u:p@127.0.0.1:5432/postgres",
      database: "my-shop-test",
    },
  );
  assert.throws(
    () => serverAndDatabase("postgres://u:p@127.0.0.1:5432/"),
    /name a database/,
  );
});
