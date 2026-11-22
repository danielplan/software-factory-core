import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit } from "@software-factory/core";

import type { Job, SetupProduct } from "../src/api.ts";
import { makeAndStart } from "../src/create-products.ts";

// A new product of a kit with a starter is a copy of the starter under the
// product's name, then the kit's commands finish it, and only then is it
// described, with the commands its kit finds in it; a starter that cannot
// be copied fails the product's job, with why.

const here = import.meta.dirname;
const prettier = join(here, "..", "..", "..", "node_modules", "prettier");

function kitWith(starter: string, more: string[] = []) {
  return defineKit({
    id: "starter-kit",
    name: "Starter kit",
    about: "A stand-in kit with a starter.",
    kind: "starter-app",
    commands: {},
    starter,
    detect: (folder) =>
      existsSync(join(folder, "package.json"))
        ? { name: "Found", commands: { verify: "npm run verify" } }
        : null,
    // Finishes the copy: a file written in it, as installing would.
    create: (folder) => [
      [
        process.execPath,
        "-e",
        [
          `const fs = require("fs"), path = require("path");`,
          `fs.writeFileSync(${JSON.stringify(join(folder, "installed"))}, "");`,
          ...more,
        ].join("\n"),
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
  dependsOn: ["shop-server"],
});

type Seen = { product: SetupProduct; files: string[] };

async function make(starter: string, folder: string, more: string[] = []) {
  let jobs: Job[] = [];
  const seen: Seen[] = [];
  let reread = 0;
  const failed = await makeAndStart(
    [product(folder)],
    [kitWith(starter, more)],
    {
      show: (shown) => {
        jobs = shown;
      },
      // What is in the folder when it is described.
      describe: (described) => {
        seen.push({
          product: described,
          files: readdirSync(folder).sort((a, b) => a.localeCompare(b)),
        });
        writeFileSync(
          join(folder, "product.json"),
          `${JSON.stringify({ id: described.id, dependsOn: described.dependsOn }, null, 2)}\n`,
        );
        return ["product.json"];
      },
      described: () => {
        reread += 1;
      },
      launcher: () => null,
    },
  );
  const [job] = jobs;
  assert.ok(job);
  return { job, seen, failed, reread };
}

function starterWith(name: string): string {
  const starter = mkdtempSync(join(tmpdir(), "starter-"));
  writeFileSync(join(starter, "package.json"), JSON.stringify({ name }));
  return starter;
}

test("a new product starts as a copy of its kit's starter, and is described after", async () => {
  const starter = starterWith("new-app");
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "apps", "shop");
  const { job, seen, failed, reread } = await make(starter, folder);
  assert.equal(job.state, "done");
  assert.deepEqual(failed, []);
  assert.equal(reread, 1);
  assert.ok(job.log.includes("Copied the Starter kit starter as garden-shop."));
  const file = JSON.parse(
    readFileSync(join(folder, "package.json"), "utf8"),
  ) as { name: string };
  assert.equal(file.name, "garden-shop");
  // Described once the starter was copied and finished, with its check.
  const [described] = seen;
  assert.ok(described);
  assert.deepEqual(described.files, ["installed", "package.json"]);
  assert.deepEqual(described.product.commands, { verify: "npm run verify" });
});

test("a starter that cannot be copied fails the product's job, and nothing is described", async () => {
  const empty = mkdtempSync(join(tmpdir(), "no-starter-"));
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "shop");
  const { job, seen, failed } = await make(empty, folder);
  assert.equal(job.state, "failed");
  assert.deepEqual(failed, ["Garden shop"]);
  assert.match(job.log.join("\n"), /has no package.json/);
  assert.ok(!existsSync(join(folder, "installed")));
  assert.deepEqual(seen, []);
});

test("a folder with code already there is used as it is, and described", async () => {
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "shop");
  mkdirSync(folder);
  writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "mine" }));
  const { job, seen } = await make(starterWith("new-app"), folder);
  assert.equal(job.state, "done");
  assert.match(job.log.join("\n"), /is there already: it is used as it is/);
  assert.ok(!existsSync(join(folder, "installed")));
  assert.deepEqual(seen[0]?.files, ["package.json"]);
});

test("what the factory writes is put in the shape of the product's own Prettier", async () => {
  const folder = join(mkdtempSync(join(tmpdir(), "made-")), "shop");
  // Installing gives the product Prettier, as a starter's packages do.
  const modules = join(folder, "node_modules");
  const link = [
    `fs.mkdirSync(${JSON.stringify(join(modules, ".bin"))}, { recursive: true });`,
    `fs.symlinkSync(${JSON.stringify(prettier)}, ${JSON.stringify(join(modules, "prettier"))});`,
    `fs.symlinkSync(${JSON.stringify(join(prettier, "bin", "prettier.cjs"))}, ${JSON.stringify(join(modules, ".bin", "prettier"))});`,
  ];
  const { job } = await make(starterWith("new-app"), folder, link);
  assert.equal(job.state, "done");
  assert.equal(
    readFileSync(join(folder, "product.json"), "utf8"),
    '{\n  "id": "shop",\n  "dependsOn": ["shop-server"]\n}\n',
  );
});
