import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude, RunOptions } from "@software-factory/core";

import type { ChecksView } from "../src/checks/checks.ts";
import { installSkills } from "../src/install-skills.ts";
import { acmeServed } from "./acme-served.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The check-up: the kobold reads a product's code, read only, and reports
// what it finds with its tool; a person sends a finding to Build or sets it
// aside; a check can be stopped.

// The example's shop as a product of the staged project, with a file to
// point at.
function withShop(project: string, root: string): void {
  mkdirSync(join(project, "shop", "src"), { recursive: true });
  writeFileSync(
    join(project, "shop", "product.json"),
    JSON.stringify({ id: "shop", name: "Shop", kind: "web-app" }),
  );
  writeFileSync(join(project, "shop", "src", "cart.ts"), "export {};\n");
  const company = join(root, "factory.json");
  const read = JSON.parse(readFileSync(company, "utf8")) as object;
  writeFileSync(company, JSON.stringify({ ...read, products: ["shop"] }));
}

const finding = (more: object = {}) => ({
  title: "The basket empties on reload",
  happens: "Everything in the basket is gone after a refresh.",
  where: "shop/src/cart.ts:1",
  kind: "bug",
  severity: "high",
  suggestion: "Keep the basket in storage.",
  ...more,
});

async function served(claude: Claude) {
  const factory = acmeServed(await stage(claude));
  withShop(factory.project, factory.root);
  const view = () => factory.read<ChecksView>("/api/checks");
  return { ...factory, view };
}

test("a check-up reports what the kobold finds, only where a file exists, in the person's language", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["report_finding", finding({ where: "shop/src/nowhere.ts:3" })],
        ["report_finding", finding({ where: "../../etc/passwd:1" })],
        ["report_finding", finding()],
      ],
      reply: "Looked at the cart.",
    },
  ]);
  const factory = await served(pretend.claude);
  try {
    assert.deepEqual((await factory.view()).products, [
      { id: "shop", name: "Shop" },
    ]);
    const started = await factory.send("/api/checks/start", {
      language: "it",
    });
    assert.equal(started.status, 200);
    await factory.settled();
    const run = pretend.seen[0] as RunOptions;
    assert.equal(run.readOnly, true);
    assert.deepEqual(run.tools, ["Read", "Grep", "Glob"]);
    assert.ok(run.deny?.includes("Read(**/.env*)"));
    assert.match(run.instructions ?? "", /name: check/);
    assert.match(run.prompt, /in shop\/, from the project's root/);
    assert.match(run.prompt, /in Italian\./);
    const [nowhere, outside, kept] = pretend.answers[0] ?? [];
    assert.match(nowhere ?? "", /There is no file “shop\/src\/nowhere.ts”/);
    assert.match(outside ?? "", /There is no file/);
    assert.equal(kept, "Kept: The basket empties on reload");
    const [check] = (await factory.view()).checks;
    assert.ok(check);
    assert.equal(check.state, "done");
    assert.equal(check.said, "Looked at the cart.");
    assert.equal(check.findings.length, 1);
    assert.equal(check.findings[0]?.status, "open");
    const ignored = readFileSync(join(factory.root, ".gitignore"), "utf8");
    assert.ok(ignored.split("\n").includes("checks.json"));
    for (const body of [{ product: "nope" }, { language: "tlh" }]) {
      const refused = await factory.send("/api/checks/start", body);
      assert.equal(refused.status, 409);
    }
  } finally {
    factory.close();
  }
});

test("a finding is set aside, or sent to Build, where it waits for a board", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["report_finding", finding()],
        ["report_finding", finding({ title: "No feedback while paying" })],
      ],
      reply: "Done.",
    },
  ]);
  const factory = await served(pretend.claude);
  try {
    await factory.send("/api/checks/start", { product: "shop" });
    await factory.settled();
    const [first, second] = (await factory.view()).checks[0]?.findings ?? [];
    assert.ok(first && second);
    const dismissed = await factory.send("/api/checks/dismiss", {
      product: "shop",
      finding: first.id,
    });
    assert.equal(dismissed.status, 200);
    const sent = await factory.send("/api/checks/send", {
      product: "shop",
      finding: second.id,
    });
    assert.equal(sent.status, 200);
    const answer = sent.body as unknown as {
      issue: number | null;
      waiting: string | null;
    };
    assert.equal(answer.issue, null);
    assert.ok(answer.waiting);
    const records = await factory.records();
    const signal = records.signals.find((s) => s.id === `check-${second.id}`);
    assert.ok(signal);
    assert.equal(signal.source, "check-up");
    assert.equal(signal.sortedAs, "bug");
    assert.deepEqual(signal.wentTo, { to: "build" });
    assert.ok(records.sources.some((s) => s.id === "check-up"));
    const after = (await factory.view()).checks[0]?.findings;
    assert.deepEqual(
      after?.map((f) => f.status),
      ["dismissed", "sent"],
    );
    const again = await factory.send("/api/checks/dismiss", {
      product: "shop",
      finding: second.id,
    });
    assert.equal(again.status, 409);
  } finally {
    factory.close();
  }
});

test("a check-up can be stopped, and one runs per product at a time", async () => {
  const seen: RunOptions[] = [];
  const claude: Claude = {
    run: async (options) => {
      seen.push(options);
      return await new Promise((resolve) => {
        options.stop?.addEventListener("abort", () => {
          resolve({ ok: false, text: "", error: "Stopped." });
        });
      });
    },
  };
  const factory = await served(claude);
  try {
    await factory.send("/api/checks/start", {});
    while (seen.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 5));
    const twice = await factory.send("/api/checks/start", {});
    assert.equal(twice.status, 409);
    assert.equal((await factory.view()).checks[0]?.state, "running");
    const stopped = await factory.send("/api/checks/stop", { product: "shop" });
    assert.equal(stopped.status, 200);
    await factory.settled();
    assert.equal((await factory.view()).checks[0]?.state, "stopped");
    const late = await factory.send("/api/checks/stop", { product: "shop" });
    assert.equal(late.status, 409);
  } finally {
    factory.close();
  }
});

test("the check skill is put beside the others in a project", () => {
  const project = mkdtempSync(join(tmpdir(), "check-skill-"));
  const put = installSkills(project);
  assert.ok(put.includes(join(".claude", "skills", "check")));
  assert.ok(put.includes(join(".agents", "skills", "check")));
});
