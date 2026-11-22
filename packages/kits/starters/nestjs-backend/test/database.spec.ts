import assert from "node:assert/strict";
import {
  leftBehind,
  serverAndDatabase,
  testDatabaseFor,
} from "../scripts/database.ts";

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

test("each working copy tests on a database of its own, named after its folder", () => {
  const url = "postgres://u:p@127.0.0.1:5432/my-shop-test";
  const one = testDatabaseFor(url, "/work/copy-1");
  const other = testDatabaseFor(url, "/work/copy-2");
  assert.match(one.name, /^my-shop-test-[0-9a-f]{8}$/);
  assert.notEqual(one.name, other.name);
  assert.equal(testDatabaseFor(url, "/work/copy-1").name, one.name);
  assert.equal(one.url, `postgres://u:p@127.0.0.1:5432/${one.name}`);
  assert.match(one.note, /\/work\/copy-1$/);
});

test("only the test databases of this computer's copies that are gone are dropped", () => {
  const gone = testDatabaseFor("postgres://h/t", "/work/gone");
  const kept = testDatabaseFor("postgres://h/t", "/work/kept");
  const databases = [
    { name: gone.name, note: gone.note },
    { name: kept.name, note: kept.note },
    {
      name: "t-elsewhere",
      note: "test database of the working copy other-computer:/work/gone",
    },
    { name: "t-own", note: null },
  ];
  assert.deepEqual(
    leftBehind(databases, (folder) => folder === "/work/kept"),
    [gone.name],
  );
});
