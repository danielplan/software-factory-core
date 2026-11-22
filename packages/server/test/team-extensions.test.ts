import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Session } from "../src/session.ts";
import { stage } from "./stage.ts";

// A team's own extension, in the factory's extensions folder: offered in the
// Marketplace as the team's, installed like any other, and switched off for
// all of them from Settings.

async function openFactory() {
  const { session, server } = await stage();
  const root = session.createCompany({ name: "Beta", about: "" });
  const folder = join(root, "extensions", "standup");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, "extension.json"),
    JSON.stringify({
      id: "standup",
      name: "Daily standup",
      about: "A short note each morning.",
      pages: [
        {
          id: "standup",
          name: "Daily standup",
          parts: [{ show: "text", text: "A short note." }],
        },
      ],
    }),
  );
  // The folder is read again whenever the factory is.
  session.switchAddOn("voice", true);
  return {
    session,
    root,
    close: () => {
      session.close();
      server.close();
    },
  };
}

const standupOf = (session: Session) => {
  const state = session.state();
  assert.ok(state.mode === "factory");
  return state.addOns.find((a) => a.id === "standup");
};

test("a team's extension is offered, installed and removed like any other", async () => {
  const { session, close } = await openFactory();
  try {
    assert.deepEqual(
      [standupOf(session)?.builtIn, standupOf(session)?.on],
      [false, false],
    );
    session.switchAddOn("standup", true);
    assert.equal(standupOf(session)?.on, true);
    session.switchAddOn("standup", false);
    assert.equal(standupOf(session)?.on, false);
  } finally {
    close();
  }
});

test("the off switch in Settings takes all of them out, and back", async () => {
  const { session, close } = await openFactory();
  try {
    assert.ok(standupOf(session));
    session.saveSettings("own-extensions", { FACTORY_OWN_EXTENSIONS: "off" });
    assert.equal(standupOf(session), undefined);
    session.saveSettings("own-extensions", { FACTORY_OWN_EXTENSIONS: "on" });
    assert.ok(standupOf(session));
  } finally {
    close();
  }
});

test("one that does not pass the checks is not offered, and the factory says why", async () => {
  const { session, root, close } = await openFactory();
  try {
    writeFileSync(
      join(root, "extensions", "standup", "extension.json"),
      JSON.stringify({ id: "standup", name: "Daily standup", always: true }),
    );
    session.switchAddOn("voice", false);
    const state = session.state();
    assert.ok(state.mode === "factory");
    assert.equal(standupOf(session), undefined);
    assert.match(state.problems.join("\n"), /says "always"/);
  } finally {
    close();
  }
});

test("its page and Home blocks are described for the page, lists read now", async () => {
  const { session, root, close } = await openFactory();
  try {
    writeFileSync(
      join(root, "extensions", "standup", "extension.json"),
      JSON.stringify({
        id: "standup",
        name: "Daily standup",
        about: "A short note.",
        blocks: [
          {
            id: "standup-open",
            name: "Open items",
            parts: [{ show: "list", from: "open.json", empty: "None" }],
          },
        ],
      }),
    );
    writeFileSync(
      join(root, "extensions", "standup", "open.json"),
      JSON.stringify([{ title: "Ask Sam" }]),
    );
    session.switchAddOn("voice", false);
    const items = () =>
      JSON.stringify(standupOf(session)?.screens.blocks[0]?.parts);
    assert.match(items(), /Ask Sam/);
    // The list's file changes: the next state has it, with no restart.
    writeFileSync(
      join(root, "extensions", "standup", "open.json"),
      JSON.stringify([{ title: "Book the room" }]),
    );
    assert.match(items(), /Book the room/);
    assert.deepEqual(standupOf(session)?.brings.blocks, ["standup-open"]);
  } finally {
    close();
  }
});

test("its stage is in the order of work once it is installed", async () => {
  const { session, root, close } = await openFactory();
  try {
    writeFileSync(
      join(root, "extensions", "standup", "extension.json"),
      JSON.stringify({
        id: "standup",
        name: "Daily standup",
        about: "A short note.",
        stages: [
          { id: "check", name: "Check", after: ["build"], before: ["done"] },
        ],
      }),
    );
    session.switchAddOn("voice", false);
    session.switchAddOn("standup", true);
    const state = session.state();
    assert.ok(state.mode === "factory");
    assert.deepEqual(
      state.stages.order.map((stage) => stage.id),
      ["check"],
    );
    assert.equal(state.stages.clash, null);
    session.switchAddOn("standup", false);
    const removed = session.state();
    assert.ok(removed.mode === "factory");
    assert.deepEqual(removed.stages.order, []);
  } finally {
    close();
  }
});
