// A check-up of the product: the kobold reads a product's code, read only
// (the check skill), and reports each problem it finds with its tool, where
// it is (a file that must exist in the project) and what happens to a
// person. One check runs per product at a time; each product keeps its last
// one (findings.ts). A person sends a finding to Build, where it becomes a
// bug sent from the records (a signal from the kobold's check-up) and a fix
// ticket when the connected board can make one; or says it is not a problem.

import { existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import {
  FACTORY_FOLDER,
  findProducts,
  KOBOLD,
  type RecordStore,
} from "@software-factory/core";

import { makeFixTicket } from "../build/answer.ts";
import type { Cards } from "../cards/cards.ts";
import type { Kobold, KoboldJob } from "../kobold/kobold.ts";
import { Refused } from "../refused.ts";
import {
  type Check,
  ChecksFile,
  type Finding,
  type FindingInput,
} from "./findings.ts";
import { checkPrompt, type Language } from "./prompt.ts";

// The most findings one check keeps: few and good.
const MOST = 15;
// The source a finding sent to Build comes from, in the records.
export const CHECK_SOURCE = { id: "check-up", name: "The kobold's check-up" };

export type CheckedProduct = { id: string; name: string };

// A check as the page sees it: what the kobold is doing while it runs.
export type CheckView = Check & { activity: string | null };

export type ChecksView = { products: CheckedProduct[]; checks: CheckView[] };

export type ChecksOn = {
  project: string;
  kobold: Kobold;
  records: () => RecordStore;
  // The connected board's cards, or refused with why there are none.
  cards: () => Cards;
};

export class Checks {
  private readonly on: ChecksOn;
  private readonly file: ChecksFile;
  // The products whose check a person stopped, until it ends.
  private readonly stopping = new Set<string>();

  constructor(on: ChecksOn) {
    this.on = on;
    this.file = new ChecksFile(on.project);
  }

  // Each product's last check, with what the kobold does while it runs; a
  // check whose job has ended since is written down as ended now.
  view(): ChecksView {
    const jobs = this.on.kobold.view();
    return {
      products: this.products().map(({ id, name }) => ({ id, name })),
      checks: this.file.all().map((check) => {
        const job = jobs.find((one) => one.id === check.job);
        if (job?.working) return { ...check, activity: job.activity };
        const ended =
          check.state === "running" ? this.ended(check.product, job) : check;
        return { ...ended, activity: null };
      }),
    };
  }

  // A check of each product named (every product when none is), in the
  // language the findings are written in.
  start(product: string | null, language?: Language): void {
    const products = this.products().filter(
      (one) => product === null || one.id === product,
    );
    if (products.length === 0)
      throw new Refused(
        product
          ? `There is no product “${product}”.`
          : "There is no product to check yet.",
      );
    const running = this.view().checks.filter((c) => c.state === "running");
    for (const one of products) {
      if (running.some((check) => check.product === one.id))
        throw new Refused(`${one.name} is being checked already.`);
    }
    for (const one of products) {
      const job = this.on.kobold.check(
        one.id,
        checkPrompt(one, this.on.project, language),
        {
          tool: "report_finding",
          act: (args) => this.found(one.id, args),
        },
      );
      this.file.started(one.id, job.id);
    }
  }

  stop(product: string): void {
    const check = this.file.of(product);
    if (check?.state !== "running")
      throw new Refused("That check-up is not running any more.");
    this.stopping.add(product);
    this.on.kobold.stop(check.job);
  }

  dismiss(product: string, finding: string): void {
    this.act(product, finding, { status: "dismissed" });
  }

  // A finding sent to Build: a bug from the check-up in the records, then
  // a fix ticket; when the board cannot make one, it waits on Build with why.
  async send(
    product: string,
    id: string,
    by: string,
  ): Promise<{ issue: number | null; waiting: string | null }> {
    const finding = this.open(product, id);
    const store = this.on.records();
    const signal = `check-${id}`;
    store.write((writer) => {
      if (!store.get("sources", CHECK_SOURCE.id))
        writer.put("sources", { ...CHECK_SOURCE, kind: "alerts" });
      writer.put("signals", {
        id: signal,
        source: CHECK_SOURCE.id,
        text: `${finding.title}. ${finding.happens} (${finding.where})`,
        when: new Date().toISOString().slice(0, 10),
        sortedAs: "bug",
        why: finding.suggestion,
        by: KOBOLD,
        wentTo: { to: "build" },
      });
    });
    try {
      const made = await makeFixTicket(store, this.on.cards, signal, by);
      this.act(product, id, { status: "sent", issue: made.issue });
      return { issue: made.issue, waiting: null };
    } catch (error) {
      if (!(error instanceof Refused)) throw error;
      this.act(product, id, { status: "sent" });
      return { issue: null, waiting: error.message };
    }
  }

  private products() {
    return findProducts(join(this.on.project, FACTORY_FOLDER)).products;
  }

  // What the kobold reported, kept when it points at a file in the project.
  private found(product: string, input: FindingInput): string {
    const file = input.where.replace(/:\d+(:\d+)?$/, "").trim();
    const path = resolve(this.on.project, file);
    const inside = !relative(this.on.project, path).startsWith(`..${sep}`);
    if (!inside || !existsSync(path))
      throw new Refused(
        `There is no file “${file}” in the project: say where it is from the project's root, like shop/src/cart.ts:42.`,
      );
    const kept = this.file.of(product)?.findings.length ?? 0;
    if (kept >= MOST)
      throw new Refused(
        `That is ${String(MOST)} already: keep only the most important ones.`,
      );
    this.file.found(product, input);
    this.on.kobold.changed();
    return `Kept: ${input.title}`;
  }

  // How a check ended, from its job: done, failed, or stopped by a person
  // (or lost, when the factory was closed while it ran).
  private ended(product: string, job: KoboldJob | undefined): Check {
    const stopped = this.stopping.delete(product) || !job;
    let state: Check["state"] = "done";
    if (stopped) state = "stopped";
    else if (job.problem) state = "failed";
    return this.file.change(product, (one) => ({
      ...one,
      ended: new Date().toISOString(),
      state,
      said: job?.problem ?? job?.done ?? null,
    }));
  }

  private open(product: string, id: string): Finding {
    const finding = this.file.of(product)?.findings.find((f) => f.id === id);
    if (!finding) throw new Refused("That finding is not there any more.");
    if (finding.status !== "open")
      throw new Refused("Someone has acted on that finding already.");
    return finding;
  }

  private act(product: string, id: string, change: Partial<Finding>): void {
    this.open(product, id);
    this.file.change(product, (check) => ({
      ...check,
      findings: check.findings.map((f) =>
        f.id === id ? { ...f, ...change } : f,
      ),
    }));
    this.on.kobold.changed();
  }
}
