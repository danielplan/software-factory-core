import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { setTimeout as sleep } from "node:timers/promises";

import { partSchema, type Part } from "@software-factory/core";

import { Launcher } from "../src/index.ts";
import { failLight, newPartLight, viewOf } from "../src/part-light.ts";

// The launcher with real programs: a pretend program (fixtures) that
// serves, crashes, hangs or works as a preparation step.

const FAKE = join(import.meta.dirname, "fixtures", "fake-program.ts");

async function freePort(): Promise<number> {
  return await new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

const part = (fields: Partial<Part> & { id: string }): Part =>
  partSchema.parse({
    name: fields.id,
    area: "products",
    does: "Something.",
    start: "auto",
    ...fields,
  });

const serving = (id: string, port: number, more: Partial<Part> = {}) =>
  part({
    id,
    run: ["node", FAKE, "serve", String(port)],
    port: { fixed: port },
    health: "/",
    ...more,
  });

function launcherWith(parts: Part[], root = mkdtempSync(join(tmpdir(), "l-"))) {
  const launcher = new Launcher({ root, parts, everyMs: 100 });
  const light = (id: string) => launcher.state().find((p) => p.id === id);
  return { launcher, light, root };
}

async function until(check: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("waited too long");
    await new Promise((done) => setTimeout(done, 50));
  }
}

test("a part starts after what it depends on, with its settings, and stops before it", async () => {
  const [a, b] = [await freePort(), await freePort()];
  const { launcher, light } = launcherWith([
    serving("api", a),
    serving("web", b, {
      dependsOn: ["api"],
      env: { GREETING: "api on {port:api}" },
      open: "/home",
    }),
  ]);
  let told = 0;
  const stopListening = launcher.subscribe(() => (told += 1));
  try {
    assert.equal(light("web")?.light, "stopped");
    assert.equal(light("web")?.canStart, true);
    await launcher.start("web");
    assert.equal(light("api")?.light, "running");
    assert.equal(light("web")?.light, "running");
    assert.equal(light("web")?.canStop, true);
    assert.equal(light("web")?.link, `http://127.0.0.1:${String(b)}/home`);
    assert.ok(told > 0);
    await launcher.stop("api");
    assert.equal(light("web")?.light, "stopped");
    assert.equal(light("api")?.light, "stopped");
    await launcher.startAll();
    await launcher.restart("api");
    assert.equal(light("web")?.light, "running");
  } finally {
    stopListening();
    await launcher.stopAll();
    launcher.close();
  }
  assert.equal(light("web")?.light, "stopped");
});

test("a crash shows a problem with its last lines and the part's help", async () => {
  const { launcher, light } = launcherWith([
    part({
      id: "bad",
      run: ["node", FAKE, "crash"],
      port: { fixed: await freePort() },
    }),
    part({
      id: "later",
      run: ["node", FAKE, "later"],
      help: { title: "It gave up", text: "Ask for help." },
    }),
    part({ id: "dep", run: ["node", FAKE, "hang"], dependsOn: ["bad"] }),
  ]);
  try {
    await launcher.start("bad");
    const bad = light("bad");
    assert.equal(bad?.light, "problem");
    assert.match(bad.problem?.title ?? "", /stopped while starting/);
    assert.deepEqual(bad.problem?.details, ["boom"]);
    await launcher.start("dep");
    assert.match(light("dep")?.problem?.title ?? "", /waiting for bad/);
    // One that runs a moment (no address to ask), then stops.
    await launcher.start("later");
    assert.equal(light("later")?.light, "running");
    await until(() => light("later")?.light === "problem");
    assert.equal(light("later")?.problem?.title, "It gave up");
    assert.deepEqual(light("later")?.problem?.details, ["gave up"]);
    await launcher.stop("later");
    assert.equal(light("later")?.light, "stopped");
  } finally {
    await launcher.stopAll();
    launcher.close();
  }
});

test("preparation steps run first; a failing one stops the start and says which", async () => {
  const port = await freePort();
  const root = mkdtempSync(join(tmpdir(), "l-"));
  writeFileSync(join(root, "package.json"), "{}");
  const { launcher, light } = launcherWith(
    [
      serving("ready", port, {
        prepare: [
          { label: "Getting ready", run: ["node", FAKE, "done"] },
          { label: "Packages", packages: true },
          {
            label: "Building",
            run: ["node", FAKE, "fail"],
            unlessFresh: { output: "package.json", inputs: ["package.json"] },
          },
        ],
      }),
      part({
        id: "broken",
        run: ["node", FAKE, "hang"],
        prepare: [{ label: "Building", run: ["node", FAKE, "fail"] }],
      }),
    ],
    root,
  );
  try {
    await launcher.start("ready");
    assert.equal(light("ready")?.light, "running");
    await launcher.start("broken");
    assert.equal(
      light("broken")?.problem?.title,
      '"Building" didn\'t work for broken',
    );
    assert.deepEqual(light("broken")?.problem?.details, ["step failed"]);
  } finally {
    await launcher.stopAll();
    launcher.close();
  }
});

test("a part already running elsewhere is shown as running, not started twice, and not stopped", async () => {
  const port = await freePort();
  const other = await freePort();
  // Another program holds a port, without answering on it.
  const outside = launcherWith([
    serving("api", port),
    part({
      id: "holder",
      run: ["node", FAKE, "listen", String(other)],
      port: { fixed: other },
    }),
  ]);
  await outside.launcher.startAll();
  const { launcher, light } = launcherWith([
    serving("api", port),
    part({
      id: "taken",
      run: ["node", FAKE, "hang"],
      port: { fixed: other },
      health: "/",
    }),
    part({ id: "checked", start: "never", health: "/", port: { fixed: port } }),
    part({ id: "nothing" }),
  ]);
  try {
    await until(() => light("api")?.light === "running");
    assert.equal(light("api")?.outside, true);
    assert.equal(light("api")?.canStop, false);
    await launcher.start("api");
    assert.equal(light("api")?.outside, true);
    await launcher.start("taken");
    assert.match(
      light("taken")?.problem?.title ?? "",
      /used by another program/,
    );
    await launcher.start("checked");
    assert.equal(light("checked")?.light, "running");
    assert.equal(light("checked")?.canStart, false);
    assert.equal(light("nothing")?.light, "none");
    // Once it stops elsewhere, the light follows.
    await outside.launcher.stop("api");
    await until(() => light("api")?.light === "stopped");
    // The port can answer a moment longer than the program runs: checking
    // again until it has gone.
    const missing = () =>
      /isn't running/.test(light("checked")?.problem?.title ?? "");
    for (let tries = 0; tries < 20 && !missing(); tries += 1) {
      await launcher.start("checked");
      if (!missing()) await sleep(100);
    }
    assert.ok(missing(), light("checked")?.problem?.title);
  } finally {
    await launcher.stopAll();
    launcher.close();
    await outside.launcher.stopAll();
    outside.launcher.close();
  }
});

test("a missing settings file, a part that never answers, and stopping now", async () => {
  const root = mkdtempSync(join(tmpdir(), "l-"));
  mkdirSync(join(root, "app"));
  writeFileSync(join(root, "app", "package.json"), "{}");
  const port = await freePort();
  const { launcher, light } = launcherWith(
    [
      part({ id: "needy", run: ["node", FAKE, "hang"], needs: ["app/.env"] }),
      part({
        id: "silent",
        run: ["node", FAKE, "hang"],
        port: { fixed: port },
        startSeconds: 1,
        folder: "app",
      }),
      part({
        id: "slow",
        run: ["node", FAKE, "hang"],
        port: { fixed: await freePort() },
      }),
    ],
    root,
  );
  try {
    await launcher.start("needy");
    assert.equal(
      light("needy")?.problem?.title,
      "The settings file app/.env is missing",
    );
    await launcher.start("silent");
    assert.equal(
      light("silent")?.problem?.title,
      "silent did not answer within 1 second",
    );
    const starting = launcher.start("slow");
    await until(() => light("slow")?.light === "starting");
    launcher.stopNow();
    await starting;
    assert.equal(light("slow")?.light, "starting");
    await launcher.stop("slow");
    assert.equal(light("slow")?.light, "stopped");
    assert.throws(() => launcher.start("ghost"), /There is no part "ghost"/);
  } finally {
    await launcher.stopAll();
    launcher.close();
  }
});

test("a part that starts with others has no buttons of its own, until it has a problem", () => {
  const part: Part = partSchema.parse({
    id: "shared",
    name: "Shared",
    area: "products",
    does: "Kept built.",
    run: ["npm", "run", "dev"],
    start: "with",
  });
  const inner = newPartLight(part);
  assert.equal(viewOf(part, inner, null).canStart, false);
  assert.equal(viewOf(part, inner, null).canStop, false);
  failLight(inner, { title: "It stopped", text: "Look at it." });
  assert.equal(viewOf(part, inner, null).canStart, true);
});
