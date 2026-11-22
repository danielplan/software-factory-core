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
      brings: { pages: ["standup"] },
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
