import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { localWhatsNew, remoteWhatsNew } from "../src/updates/whats-new.ts";

const folder = mkdtempSync(join(tmpdir(), "whats-new-files-"));
after(() => {
  rmSync(folder, { recursive: true, force: true });
});

test("the files are found by walking up from the server's folder", () => {
  const deep = join(folder, "node_modules", "@x", "server", "src");
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(folder, "WHATS-NEW.md"), "en");
  writeFileSync(join(folder, "WHATS-NEW.de.md"), "de");
  assert.deepEqual(localWhatsNew(deep), { en: "en", de: "de" });
});

test("no files give an empty list", () => {
  const empty = mkdtempSync(join(tmpdir(), "whats-new-none-"));
  try {
    assert.deepEqual(localWhatsNew(empty), {});
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("a release's files come from GitHub, or null when it cannot be reached", async () => {
  const real = globalThis.fetch;
  try {
    globalThis.fetch = ((url: string) =>
      Promise.resolve(
        url.endsWith("WHATS-NEW.de.md")
          ? new Response("no", { status: 404 })
          : new Response(`words of ${url.split("/").at(-2)}`),
      )) as typeof fetch;
    assert.deepEqual(await remoteWhatsNew("0.12.0"), {
      en: "words of release-0.12.0",
      it: "words of release-0.12.0",
    });
    globalThis.fetch = (() =>
      Promise.reject(new Error("offline"))) as typeof fetch;
    assert.equal(await remoteWhatsNew("0.12.0"), null);
    globalThis.fetch = (() =>
      Promise.resolve(new Response("x", { status: 500 }))) as typeof fetch;
    assert.equal(await remoteWhatsNew("0.12.0"), null);
  } finally {
    globalThis.fetch = real;
  }
});
