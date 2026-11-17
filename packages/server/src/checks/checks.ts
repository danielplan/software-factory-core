// A check-up of the product: the kobold reads a product's code, read only
// (the check skill), and reports each problem it finds with its tool, where
// it is (a file and a line that must exist in the project) and what happens
// to a person. One check runs per product at a time; what each finds is
// added to what the ones before found (findings.ts), and the kobold is told
// those, so it looks further instead of finding them again. A person sends a finding to Build, where it becomes a
// bug sent from the records (a signal from the kobold's check-up) and a fix
// ticket when the connected board can make one; or says it is not a problem,
// and may bring it back.

import { join } from "node:path";

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
  alike,
  type Check,
  ChecksFile,
  type Finding,
  type FindingInput,
} from "./findings.ts";
import { checkPrompt, type Language } from "./prompt.ts";
import { checkPlace } from "./where.ts";

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
      const known = this.file.of(one.id)?.findings ?? [];
      const job = this.on.kobold.check(
        one.id,
        checkPrompt(one, this.on.project, { language, known }),
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

  // A finding set aside, brought back to look at again.
  restore(product: string, id: string): void {
    const finding = this.of(product, id);
    if (finding.status !== "dismissed")
      throw new Refused("That finding is not set aside.");
    this.change(product, id, { status: "open" });
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

  // What the kobold reported, kept when it points at a line of a file in
  // the project and is not known already.
  private found(product: string, input: FindingInput): string {
    checkPlace(this.on.project, input.where);
    const check = this.file.of(product);
    const known = check?.findings.find((one) => alike(one, input));
    if (known?.status === "dismissed")
      throw new Refused(
        "A person said that one is not a problem: leave it out.",
      );
    if (known || check?.incoming.some((one) => alike(one, input)))
      throw new Refused("That one is known already: look for others.");
    if ((check?.incoming.length ?? 0) >= MOST)
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
    return this.file.ended(product, {
      state,
      said: job?.problem ?? job?.done ?? null,
    });
  }

  private of(product: string, id: string): Finding {
    const finding = this.file.of(product)?.findings.find((f) => f.id === id);
    if (!finding) throw new Refused("That finding is not there any more.");
    return finding;
  }

  private open(product: string, id: string): Finding {
    const finding = this.of(product, id);
    if (finding.status !== "open")
      throw new Refused("Someone has acted on that finding already.");
    return finding;
  }

  private act(product: string, id: string, change: Partial<Finding>): void {
    this.open(product, id);
    this.change(product, id, change);
  }

  private change(product: string, id: string, change: Partial<Finding>) {
    this.file.change(product, (check) => ({
      ...check,
      findings: check.findings.map((f) =>
        f.id === id ? { ...f, ...change } : f,
      ),
    }));
    this.on.kobold.changed();
  }
}
