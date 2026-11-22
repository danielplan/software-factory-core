import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { homeLayoutRoutes } from "../src/home-layout.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const url = new URL("http://localhost/");

function routesIn() {
  const project = mkdtempSync(join(tmpdir(), "home-layout-"));
  made.push(project);
  const told: string[] = [];
  const routes = homeLayoutRoutes(project, (what) => told.push(what));
  const route = (name: string) => {
    const found = routes[name];
    assert.ok(found, name);
    return found;
  };
  return { project, told, route };
}

test("nobody arranged Home yet: there is no layout and the page shows its own", async () => {
  const { route } = routesIn();
  assert.deepEqual(await route("GET /api/home-layout")({}, url), {
    layout: null,
  });
});

test("an arrangement is kept in the factory's files for the whole team, and the page is told", async () => {
  const { project, told, route } = routesIn();
  const layout = { order: ["loop", "status", "signals"], hidden: ["signals"] };
  await route("POST /api/home-layout")(layout, url);
  assert.deepEqual(await route("GET /api/home-layout")({}, url), { layout });
  const kept: unknown = JSON.parse(
    readFileSync(join(project, "factory", "home.json"), "utf8"),
  );
  assert.deepEqual(kept, layout);
  assert.deepEqual(told, ["home"]);
});

test("a block twice in the arrangement is kept once", async () => {
  const { route } = routesIn();
  await route("POST /api/home-layout")(
    { order: ["status", "loop", "status"], hidden: [] },
    url,
  );
  assert.deepEqual(await route("GET /api/home-layout")({}, url), {
    layout: { order: ["status", "loop"], hidden: [] },
  });
});

test("something that is not an arrangement is refused, and nothing is kept", async () => {
  const { route } = routesIn();
  for (const body of [
    null,
    { order: "status", hidden: [] },
    { order: ["status"] },
    { order: ["../status"], hidden: [] },
    { order: [1], hidden: [] },
  ])
    assert.throws(() => route("POST /api/home-layout")(body, url), {
      message: /not an arrangement/,
    });
  assert.deepEqual(await route("GET /api/home-layout")({}, url), {
    layout: null,
  });
});

test("a file edited by hand into something unreadable starts Home again", async () => {
  const { project, route } = routesIn();
  mkdirSync(join(project, "factory"));
  writeFileSync(join(project, "factory", "home.json"), "{ not json");
  assert.deepEqual(await route("GET /api/home-layout")({}, url), {
    layout: null,
  });
});

test("a block no extension brings any more is let go when Home is saved, one that is only not installed stays", async () => {
  const project = mkdtempSync(join(tmpdir(), "home-layout-"));
  made.push(project);
  const routes = homeLayoutRoutes(
    project,
    () => {},
    () => ["status", "checklist"],
  );
  const save = routes["POST /api/home-layout"];
  const read = routes["GET /api/home-layout"];
  assert.ok(save && read);
  await save(
    { order: ["status", "gone", "checklist"], hidden: ["gone", "checklist"] },
    url,
  );
  assert.deepEqual(await read({}, url), {
    layout: { order: ["status", "checklist"], hidden: ["checklist"] },
  });
});
