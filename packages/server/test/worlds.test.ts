import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore, type World } from "@software-factory/core";

import { checkRecordsHere } from "../src/check-command.ts";
import type { ExplorationPage } from "../src/extensions/explorations/views.ts";
import { inGit } from "./git-project.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { kobbleStage } from "./stage.ts";

// The made-up world an exploration's prototypes share: its address for
// the prototypes (from other ports of this computer), the kobold's world
// tools, the world a prototype is started in and told about, and the
// products' own check of their situations.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

type Turn = Parameters<typeof pretendClaude>[0][number];

// A factory with Acme's records and its Orders service, whose world is
// three situations; its prototypes write where the world answers.
async function worldFactory(turns: Turn[] = []) {
  const pretend = pretendClaude(turns);
  // With Kobble's own extensions, Explorations among them.
  const staged = await kobbleStage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  cpSync(join(ACME, "orders"), join(staged.project, "orders"), {
    recursive: true,
  });
  const company = JSON.parse(
    readFileSync(join(root, "factory.json"), "utf8"),
  ) as Record<string, unknown>;
  writeFileSync(
    join(root, "factory.json"),
    JSON.stringify({
      ...company,
      products: ["orders"],
      prototype: {
        start: `sh -c 'echo "$FACTORY_WORLD_URL" > world.txt; echo FACTORY_URL=http://localhost:5999'`,
      },
    }),
  );
  const world = (id: string, init?: RequestInit) =>
    fetch(`${staged.base}/api/kobble/world/${id}`, init);
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return {
    ...staged,
    ...pretend,
    root,
    store: new KobbleStore(root),
    world,
    close,
  };
}

const LOCAL = { origin: "http://localhost:5301" };

test("prototypes on other ports read and change the world, on the version they saw", async () => {
  const factory = await worldFactory();
  try {
    const first = await factory.world("X-1", { headers: LOCAL });
    assert.equal(first.status, 200);
    assert.equal(
      first.headers.get("access-control-allow-origin"),
      "http://localhost:5301",
    );
    const world = (await first.json()) as World;
    assert.equal(world.situation, "everyday");
    assert.equal(world.version, 1);
    assert.deepEqual(world.signed_in, { shop: "c-2841" });
    assert.equal(world.tables.basket_lines?.length, 2);
    // Kept beside the exploration, so it survives a restart.
    assert.deepEqual(factory.store.world("X-1"), world);
    const change = (version: number, body: object = {}) =>
      factory.world("X-1", {
        method: "POST",
        headers: { ...LOCAL, "content-type": "application/json" },
        body: JSON.stringify({
          version,
          changes: [
            { table: "basket_lines", op: "remove", row: { id: "b-1" } },
          ],
          ...body,
        }),
      });
    const changed = await change(1);
    assert.equal(changed.status, 200);
    const next = (await changed.json()) as World;
    assert.equal(next.version, 2);
    assert.equal(next.tables.basket_lines?.length, 1);
    // Another tab, still on version 1: refused, nothing lost.
    const stale = await change(1);
    assert.equal(stale.status, 409);
    assert.match(
      ((await stale.json()) as { error: string }).error,
      /changed meanwhile/,
    );
    assert.equal((await change(2, { changes: "no" })).status, 400);
    const unknown = await change(2, {
      changes: [{ table: "nothing", op: "add", row: {} }],
    });
    assert.equal(unknown.status, 400);
    // Start again: the situation as it was.
    const reset = await fetch(`${factory.base}/api/kobble/world/X-1/reset`, {
      method: "POST",
      headers: LOCAL,
    });
    const again = (await reset.json()) as World;
    assert.equal(again.version, 1);
    assert.equal(again.tables.basket_lines?.length, 2);
  } finally {
    factory.close();
  }
});

test("only pages on this computer reach the world, and only an exploration's", async () => {
  const factory = await worldFactory();
  try {
    const preflight = await factory.world("X-1", {
      method: "OPTIONS",
      headers: LOCAL,
    });
    assert.equal(preflight.status, 204);
    assert.match(
      preflight.headers.get("access-control-allow-methods") ?? "",
      /POST/,
    );
    const elsewhere = await factory.world("X-1", {
      headers: { origin: "https://example.com" },
    });
    assert.equal(elsewhere.status, 403);
    // A program on this computer (no page): no CORS needed.
    const plain = await factory.world("X-2");
    assert.equal(plain.status, 200);
    assert.equal(plain.headers.get("access-control-allow-origin"), null);
    assert.equal((await factory.world("X-99")).status, 404);
    assert.equal(
      (await factory.world("X-1", { method: "DELETE" })).status,
      405,
    );
    // No product with a world: there is none to share.
    writeFileSync(
      join(factory.project, "orders", "product.json"),
      JSON.stringify({ id: "orders", name: "Orders", kind: "x" }),
    );
    const none = await factory.world("X-3");
    assert.equal(none.status, 404);
    assert.match(
      ((await none.json()) as { error: string }).error,
      /No product has a made-up world yet/,
    );
  } finally {
    factory.close();
  }
});

test("the kobold looks at the world, reads rows, changes them and starts again", async () => {
  const factory = await worldFactory([
    {
      calls: [
        ["look_at_world", {}],
        ["world_rows", { table: "products" }],
        ["world_rows", { table: "nothing" }],
        [
          "change_world",
          {
            changes: [
              {
                table: "products",
                op: "change",
                row: { id: "p-3", in_stock: 5 },
              },
            ],
          },
        ],
        [
          "change_world",
          { changes: [{ table: "orders", op: "remove", row: { id: "o-9" } }] },
        ],
        ["use_situation", { situation: "first-visit" }],
        ["use_situation", { situation: "holidays" }],
        ["use_situation", {}],
      ],
      reply: "The coffee is back.",
    },
  ]);
  try {
    await factory.post("/api/kobble/explorations/say", {
      id: "X-1",
      text: "Put the coffee back in stock.",
    });
    for (;;) {
      const page = (await (
        await fetch(`${factory.base}/api/kobble/exploration?id=X-1`)
      ).json()) as ExplorationPage;
      if (page.talk.writing === null && factory.answers[0]) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const [look, rows, noTable, changed, refused, used, unknown, again] =
      factory.answers[0];
    assert.match(
      look ?? "",
      /started from the situation “An everyday evening”/,
    );
    assert.match(look ?? "", /Signed in: shop: c-2841/);
    assert.match(look ?? "", /- monthly-buyers: Monday for a bakery\./);
    assert.match(rows ?? "", /"Coffee beans, 500 g"/);
    assert.equal(noTable, "There is no table nothing.");
    assert.match(changed ?? "", /Changed products: the world is at version 2/);
    assert.match(refused ?? "", /orders has no row with the id "o-9"/);
    assert.equal(used, "The world starts again from first-visit.");
    assert.match(unknown ?? "", /There is no situation holidays/);
    assert.equal(again, "The world starts again from first-visit.");
    assert.equal(factory.store.world("X-1")?.situation, "first-visit");
  } finally {
    factory.close();
  }
});

test("a prototype is told where its world is, and opened for a persona starts in the persona's situation", async () => {
  const factory = await worldFactory([{ calls: [], reply: "Made it." }]);
  try {
    inGit(factory.project);
    await factory.post("/api/kobble/explorations/make", {
      id: "X-1",
      choice: "choice-1",
      key: "C",
    });
    const copy = join(factory.project, "..", "project-prototypes", "X-1", "c");
    const state = async () =>
      (
        (await (
          await fetch(`${factory.base}/api/kobble/exploration?id=X-1`)
        ).json()) as ExplorationPage
      ).runs.find((run) => run.version === "C")?.making;
    while (await state())
      await new Promise((resolve) => setTimeout(resolve, 20));
    // It names a start command: the board may start its prototype.
    const page = (await (
      await fetch(`${factory.base}/api/kobble/exploration?id=X-1`)
    ).json()) as ExplorationPage;
    assert.equal(page.canRun, true);
    const opened = await factory.post("/api/kobble/explorations/open", {
      id: "X-1",
      key: "C",
      persona: "bruno",
    });
    assert.equal(opened.status, 200);
    while (!existsSync(join(copy, "world.txt")))
      await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(
      readFileSync(join(copy, "world.txt"), "utf8").trim(),
      `${factory.base}/api/kobble/world/X-1`,
    );
    assert.equal(factory.store.world("X-1")?.situation, "monthly-buyers");
  } finally {
    factory.close();
  }
});

test("the check runs each product's own check of its situations", () => {
  const project = join(mkdtempSync(join(tmpdir(), "world-check-")), "acme");
  cpSync(ACME, project, { recursive: true });
  const lines: string[] = [];
  assert.equal(
    checkRecordsHere(project, undefined, (l) => lines.push(l)),
    0,
  );
  assert.match(lines.join("\n"), /every rule is kept/);
  const file = join(project, "orders", "prototype-world", "everyday.json");
  const situation = JSON.parse(readFileSync(file, "utf8")) as {
    tables: Record<string, unknown[]>;
  };
  situation.tables.orders = [{ id: "o-1", customer_id: "c-404" }];
  writeFileSync(file, JSON.stringify(situation));
  const failed: string[] = [];
  assert.equal(
    checkRecordsHere(project, undefined, (l) => failed.push(l)),
    1,
  );
  assert.match(
    failed.join("\n"),
    /orders: its world check \(node check-world.mjs\) failed:\neveryday.json: orders o-1 has no status/,
  );
});
