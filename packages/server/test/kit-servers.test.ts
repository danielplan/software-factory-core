import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit } from "@software-factory/core";

import { addKitServers } from "../src/kit-servers.ts";

// The kits' MCP servers, written into the project's .mcp.json: added where
// missing, never changing what the project has.

const svelte = defineKit({
  id: "svelte-site",
  name: "Svelte site",
  about: "A site.",
  kind: "svelte-site",
  commands: {},
  mcp: { svelte: { type: "stdio", command: "npx", args: ["svelte-mcp"] } },
});
const plain = defineKit({
  id: "plain",
  name: "Plain",
  about: "Code.",
  kind: "plain",
  commands: {},
});

const read = (project: string) =>
  JSON.parse(readFileSync(join(project, ".mcp.json"), "utf8")) as unknown;

test("a kit's MCP servers go into the project's .mcp.json, beside what is there", () => {
  const project = mkdtempSync(join(tmpdir(), "mcp-"));
  assert.deepEqual(addKitServers(project, [plain]), []);
  assert.deepEqual(addKitServers(project, [svelte, plain]), ["svelte"]);
  assert.deepEqual(read(project), {
    mcpServers: {
      svelte: { type: "stdio", command: "npx", args: ["svelte-mcp"] },
    },
  });
  // A server of that name already there is kept as it is.
  writeFileSync(
    join(project, ".mcp.json"),
    JSON.stringify({
      other: true,
      mcpServers: { svelte: { type: "stdio", command: "mine", args: [] } },
    }),
  );
  assert.deepEqual(addKitServers(project, [svelte]), []);
  assert.deepEqual(read(project), {
    other: true,
    mcpServers: { svelte: { type: "stdio", command: "mine", args: [] } },
  });
  // One that cannot be read is left alone.
  for (const broken of ["{ nope", "[]", '{"mcpServers": 3}']) {
    writeFileSync(join(project, ".mcp.json"), broken);
    assert.deepEqual(addKitServers(project, [svelte]), []);
    assert.equal(readFileSync(join(project, ".mcp.json"), "utf8"), broken);
  }
});
