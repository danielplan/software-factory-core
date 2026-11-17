import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { run } from "@software-factory/core";

import {
  folderIn,
  projectView,
  remoteWords,
  stackOf,
} from "../src/product/stack.ts";
import { stage } from "./stage.ts";

// What the factory sees of the project: its branch and remote, and what
// each product is built with, read from its own files.

const folderWith = (files: Record<string, string>) => {
  const folder = mkdtempSync(join(tmpdir(), "stack-"));
  for (const [name, text] of Object.entries(files))
    writeFileSync(join(folder, name), text);
  return folder;
};

test("a product's stack comes from its package.json and a few files, in groups", () => {
  const web = folderWith({
    "package.json": JSON.stringify({
      dependencies: { react: "19", "@prisma/client": "6", ioredis: "5" },
      devDependencies: { vite: "7", vitest: "3", typescript: "6", left: "1" },
    }),
    Dockerfile: "FROM node",
  });
  assert.deepEqual(stackOf(web), [
    { group: "Language", items: ["TypeScript"] },
    { group: "Interface", items: ["React"] },
    { group: "Data", items: ["Prisma", "Redis"] },
    { group: "Checks", items: ["Vitest"] },
    { group: "Tools", items: ["Vite", "Docker"] },
  ]);
  const api = folderWith({
    "package.json": JSON.stringify({ dependencies: { "@nestjs/core": "11" } }),
  });
  assert.deepEqual(stackOf(api), [
    { group: "Language", items: ["JavaScript"] },
    { group: "Server", items: ["NestJS"] },
  ]);
  assert.deepEqual(stackOf(folderWith({ "go.mod": "module x" })), [
    { group: "Language", items: ["Go"] },
  ]);
  assert.deepEqual(stackOf(folderWith({ "package.json": "{ not json" })), []);
  assert.deepEqual(stackOf(join(tmpdir(), "no-such-folder-here")), []);
});

test("the project: its folder, branch and remote, never with a password", async () => {
  const project = folderWith({});
  assert.deepEqual(await projectView(project), {
    name: project.split("/").pop(),
    folder: project,
    branch: null,
    remote: null,
  });
  const git = (...args: string[]) => run("git", ["-C", project, ...args]);
  await git("init", "-q", "-b", "trunk");
  await git(
    "remote",
    "add",
    "origin",
    "https://me:secret@github.com/acme/shop.git",
  );
  await git(
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "x",
  );
  assert.deepEqual(
    [(await projectView(project)).branch, (await projectView(project)).remote],
    ["trunk", "github.com/acme/shop"],
  );
  assert.equal(
    remoteWords("git@github.com:acme/shop.git"),
    "github.com/acme/shop",
  );
  assert.equal(remoteWords("not a remote"), null);
  for (const [remote, shown] of [
    ["user:pass@github.com:acme/shop.git", "github.com/acme/shop"],
    ["user:tok@en@host.example:x", "host.example/x"],
    ["github.com:acme/shop.git", "github.com/acme/shop"],
    ["ssh://user:pass@host.example/acme/shop.git", "host.example/acme/shop"],
    ["https://token@github.com/acme/shop", "github.com/acme/shop"],
  ])
    assert.equal(remoteWords(remote ?? ""), shown);
  assert.equal(folderIn("/p", "shop"), "/p/shop");
  assert.equal(folderIn("/p", "/elsewhere/shop"), "/elsewhere/shop");
  mkdirSync(join(project, "unused"));
});

test("GET /api/product: refused before there is a factory, then the project and its products", async () => {
  const { session, server, base } = await stage();
  try {
    assert.equal((await fetch(`${base}/api/product`)).status, 409);
    session.createCompany({ name: "Acme", about: "Sells garden tools." });
    const page = (await (await fetch(`${base}/api/product`)).json()) as {
      project: { folder: string };
      products: unknown[];
    };
    assert.equal(page.project.folder, session.options.project);
    assert.deepEqual(page.products, []);
  } finally {
    session.close();
    server.close();
  }
});
