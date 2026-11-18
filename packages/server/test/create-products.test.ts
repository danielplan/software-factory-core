import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit } from "@software-factory/core";

import type { Job, SetupProduct } from "../src/api.ts";
import { makeAndStart } from "../src/create-products.ts";

// A new product of a kit with a starter is a copy of the starter under the
// product's name, then the kit's commands finish it; a starter that cannot
// be copied fails the product's job, with why.

function kitWith(starter: string) {
  return defineKit({
    id: "starter-kit",
    name: "Starter kit",
    about: "A stand-in kit with a starter.",
    kind: "starter-app",
    commands: {},
    starter,
    // Finishes the copy: a file written in it, as installing would.
    create: (folder) => [
      [
        process.execPath,
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(join(folder, "installed"))}, "")`,
      ],
    ],
  });
}

const product = (folder: string): SetupProduct => ({
  id: "shop",
  name: "Garden shop",
  kind: "starter-app",
  folder,
  about: "",
  isNew: true,
});

async function make(starter: string, folder: string): Promise<Job> {
  let jobs: Job[] = [];
  await makeAndStart([product(folder)], [kitWith(starter)], {
    show: (shown) => {
      jobs = shown;
    },
    launcher: () => null,
  });
  const [job] = jobs;
  assert.ok(job);
  return job;
}

test("a new product starts as a copy of its kit's starter", async () => {
  const starter = mkdtempSync(join(tmpdir(), "starter-"));
  writeFileSync(
    join(starter, "package.json"),
    JSON.stringify({ name: "new-app" }),
  );
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "apps", "shop");
  const job = await make(starter, folder);
  assert.equal(job.state, "done");
  assert.ok(job.log.includes("Copied the Starter kit starter as garden-shop."));
  const file = JSON.parse(
    readFileSync(join(folder, "package.json"), "utf8"),
  ) as { name: string };
  assert.equal(file.name, "garden-shop");
  assert.ok(existsSync(join(folder, "installed")));
});

test("a starter that cannot be copied fails the product's job", async () => {
  const empty = mkdtempSync(join(tmpdir(), "no-starter-"));
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "shop");
  const job = await make(empty, folder);
  assert.equal(job.state, "failed");
  assert.match(job.log.join("\n"), /has no package.json/);
  assert.ok(!existsSync(join(folder, "installed")));
});
