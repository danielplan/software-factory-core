import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  addressOf,
  checkParts,
  envOf,
  inStartOrder,
  linkOf,
  partSchema,
  portOf,
  type Part,
} from "../src/index.ts";

const part = (fields: Partial<Part> & { id: string }): Part =>
  partSchema.parse({
    name: fields.id,
    area: "products",
    does: "Something.",
    start: "auto",
    run: ["npm", "start"],
    ...fields,
  });

test("a broken list of parts is reported in plain words", () => {
  const parts = [
    part({ id: "web", dependsOn: ["api", "nowhere"] }),
    part({ id: "api", port: { part: "missing" } }),
    part({ id: "api" }),
    part({ id: "idle", run: undefined }),
    part({ id: "fixed", start: "never", startChoice: true, health: "/" }),
    part({ id: "loop-a", dependsOn: ["loop-b"] }),
    part({ id: "loop-b", dependsOn: ["loop-a"] }),
  ];
  assert.deepEqual(checkParts(parts), [
    '"api" is in the list twice',
    '"web" depends on "nowhere", which is not in the list',
    '"api" uses the address of "missing", which is not in the list',
    '"idle" can be started but has nothing to start',
    '"fixed" is never started, so how it starts cannot be chosen',
    '"web" is listed before "api"',
    '"loop-a" is listed before "loop-b"',
    '"loop-a" depends on itself in a circle',
    '"loop-b" depends on itself in a circle',
  ]);
  assert.deepEqual(
    inStartOrder(parts.slice(0, 2)).map((p) => p.id),
    ["api", "web"],
  );
  assert.deepEqual(
    inStartOrder(parts.slice(5)).map((p) => p.id),
    ["loop-b", "loop-a"],
  );
});

test("addresses come from the settings files, fixed ports or another part", () => {
  const root = mkdtempSync(join(tmpdir(), "parts-"));
  mkdirSync(join(root, "api"));
  writeFileSync(join(root, "api", ".env"), "PORT=4321\n");
  const api = part({
    id: "api",
    port: { env: "api/.env", key: "PORT", default: 3000 },
    open: "/docs",
  });
  const docs = part({ id: "docs", port: { part: "api" }, open: "/guide" });
  const web = part({
    id: "web",
    port: { fixed: 8080 },
    open: "https://example.com/board",
    env: { API_URL: "http://127.0.0.1:{port:api}", NONE: "{port:nowhere}" },
  });
  const plain = part({ id: "plain" });
  const parts = [api, docs, web, plain];
  assert.equal(portOf(api, parts, root), 4321);
  assert.equal(portOf(docs, parts, root), 4321);
  assert.equal(addressOf(web, parts, root), "http://127.0.0.1:8080");
  assert.equal(addressOf(plain, parts, root), null);
  assert.equal(linkOf(docs, parts, root), "http://127.0.0.1:4321/guide");
  assert.equal(linkOf(web, parts, root), "https://example.com/board");
  assert.equal(linkOf(plain, parts, root), null);
  assert.deepEqual(envOf(web, parts, root), {
    API_URL: "http://127.0.0.1:4321",
    NONE: "",
  });
  assert.equal(envOf(api, parts, root), undefined);
  // Without the file, or with a value that is not a port: the default.
  writeFileSync(join(root, "api", ".env"), "PORT=soon\n");
  assert.equal(portOf(api, parts, root), 3000);
  // A part that points at itself has no address.
  const self = part({ id: "self", port: { part: "self" } });
  assert.equal(portOf(self, [self], root), null);
});
