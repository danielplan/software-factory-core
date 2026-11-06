import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit, envOf, loadFactory, type Product } from "../src/index.ts";

// A working copy runs beside the owner's checkout: its products on ports
// moved by the copy's shift, with the settings they get in a copy.

const site = defineKit({
  id: "site",
  name: "Site",
  about: "A site.",
  kind: "site",
  commands: {},
  port: 5000,
  partsFor: (product: Product) => [
    {
      id: product.id,
      name: product.name,
      area: "products",
      does: "Serves.",
      dependsOn: product.dependsOn,
      run: ["node", "serve.js"],
      env: { PORT: String(product.port) },
      port: { fixed: product.port ?? 0 },
      start: "auto",
    },
  ],
});

function factory(): string {
  const root = join(mkdtempSync(join(tmpdir(), "copy-")), "factory");
  const product = (id: string, more: object) => {
    mkdirSync(join(root, "products", id), { recursive: true });
    writeFileSync(
      join(root, "products", id, "product.json"),
      JSON.stringify({
        id,
        name: id,
        kind: "site",
        code: `../../../${id}`,
        ...more,
      }),
    );
  };
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "factory.json"),
    JSON.stringify({ name: "Acme", kits: ["site"] }),
  );
  product("api", {
    port: 3001,
    copyEnv: { API_PORT: "{port:api}", DATA_DIR: "{data}/db", CODE: "{copy}" },
  });
  product("web", { copyEnv: { API_URL: "http://127.0.0.1:{port:api}" } });
  return root;
}

test("in a working copy, the products run on moved ports with their copy settings", () => {
  const root = factory();
  const available = { kits: [site], extensions: [] };
  const own = loadFactory(root, available);
  assert.ok(!("problem" in own));
  const ownApi = own.parts.find((p) => p.id === "api");
  assert.deepEqual(ownApi?.port, { fixed: 3001 });
  assert.deepEqual(ownApi.env, { PORT: "3001" });

  const copy = loadFactory(root, available, {
    folder: "/copies/7",
    data: "/copies/.data/7",
    shift: 100,
  });
  assert.ok(!("problem" in copy));
  const api = copy.parts.find((p) => p.id === "api");
  const web = copy.parts.find((p) => p.id === "web");
  assert.ok(api && web);
  assert.deepEqual(api.port, { fixed: 3101 });
  // A product without a port of its own gets its kit's, moved.
  assert.deepEqual(web.port, { fixed: 5100 });
  assert.deepEqual(envOf(api, copy.parts, root), {
    PORT: "3101",
    API_PORT: "3101",
    DATA_DIR: "/copies/.data/7/db",
    CODE: "/copies/7",
  });
  assert.deepEqual(envOf(web, copy.parts, root), {
    PORT: "5100",
    API_URL: "http://127.0.0.1:3101",
  });
});
