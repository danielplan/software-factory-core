import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

// Each collection of Kobble's records belongs to one extension, which alone
// reads and writes it; anyone else (the core, another extension) goes
// through that extension's plug. A store call that names a collection
// ("signals" …) outside its extension's folder breaks that.

const SRC = join(import.meta.dirname, "..", "src");

const OWNERS: Record<string, string> = {
  signals: "signals",
  explorations: "explorations",
  personas: "personas",
  tests: "testing",
};

// A store call naming a collection: store.all("signals"), .put(\n"tests" …
const CALL = /\.(?:all|get|put|nextId|remove)\(\s*"(\w+)"/g;

function filesIn(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

// The extension a file belongs to, or null for the core and the app.
function extensionOf(file: string): string | null {
  const [top, id] = relative(SRC, file).split(sep);
  return top === "extensions" ? (id ?? null) : null;
}

test("only the extension that owns a collection of records names it in a store call", () => {
  const strays = filesIn(SRC).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(CALL)].flatMap(([, kind]) => {
      const owner = kind ? OWNERS[kind] : undefined;
      if (!owner || extensionOf(file) === owner) return [];
      return [`${relative(SRC, file)} names "${kind ?? ""}"`];
    }),
  );
  assert.deepEqual(strays, []);
});

test("the check finds a collection named outside its extension", () => {
  const found = [
    ...'store.all("signals"); store.put(\n  "tests", x)'.matchAll(CALL),
  ].map(([, kind]) => kind);
  assert.deepEqual(found, ["signals", "tests"]);
  assert.equal(
    extensionOf(join(SRC, "extensions", "signals", "views.ts")),
    "signals",
  );
  assert.equal(extensionOf(join(SRC, "feedback", "arrivals.ts")), null);
});
