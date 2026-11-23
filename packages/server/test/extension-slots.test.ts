import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { KOBBLE_MODULES } from "../src/app/modules.ts";
import type { Host } from "../src/plugs/extension.ts";

// An extension declares the slots it uses, so the factory can say when
// nothing fills one: each of Kobble's own reaches only the slots it
// declares as it is served.

const project = mkdtempSync(join(tmpdir(), "extension-slots-"));
after(() => {
  rmSync(project, { recursive: true, force: true });
});

// A host that hears which slots are reached, and answers anything else
// with something that does nothing.
function listeningHost(used: Set<string>): Host {
  const known = {
    project,
    factory: join(project, "factory"),
    slots: {
      get code() {
        used.add("code");
        return {};
      },
      get tasks() {
        used.add("tasks");
        return {};
      },
    },
  };
  return new Proxy(known, {
    get: (target, key) =>
      key in target
        ? (Reflect.get(target, key) as unknown)
        : () => () => undefined,
  }) as unknown as Host;
}

test("each of Kobble's extensions reaches only the slots it declares", () => {
  for (const module of KOBBLE_MODULES) {
    const used = new Set<string>();
    module.serve?.(listeningHost(used));
    const declared: string[] = module.extension.slots;
    assert.deepEqual(
      [...used].filter((slot) => !declared.includes(slot)),
      [],
      `${module.extension.id} reaches a slot it does not declare`,
    );
  }
});
