import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { teamRoutes } from "../src/coach/setup-team.ts";
import { Refused } from "../src/refused.ts";

test("setup saves the team's choices in the team file, before the factory exists", async () => {
  const project = mkdtempSync(join(tmpdir(), "setup-team-"));
  const routes = teamRoutes(project);
  const get = routes["GET /api/setup/team"];
  const post = routes["POST /api/setup/team"];
  assert.ok(get && post);
  const url = new URL("http://localhost");
  assert.deepEqual(await get(null, url), { cards: 1, usage: false });
  assert.deepEqual(await post({ cards: 3, usage: true }, url), {
    cards: 3,
    usage: true,
  });
  const team = readFileSync(join(project, "factory", "team.env"), "utf8");
  assert.match(team, /FACTORY_PARALLEL_CARDS=3/);
  assert.match(team, /FACTORY_USAGE_LOG=on/);
  assert.ok(!existsSync(join(project, "factory", "factory.json")));
  await assert.rejects(async () => post({ cards: 9 }, url), Refused);
  assert.deepEqual(await post({}, url), { cards: 3, usage: true });
});
