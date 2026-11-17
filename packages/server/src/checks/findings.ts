// What a check-up found, and where it is kept: one file in the factory's
// folder, checks.json, with each product's findings and its last check.
// Like the records' database it is about this computer's copy of the code
// at one moment, so git ignores it (the factory's .gitignore names it as
// soon as the first check starts). A finding is the kobold's, as the kobold
// reported it with its tool, until a person sends it to Build or says it is
// not a problem (and may bring it back). Each check looks at part of the
// code, so what one finds is added to what the ones before found: while it
// runs its findings wait apart, and the last ones stay as they were; when
// it ends they join them, marked new.
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { placeOf } from "./where.ts";

const FILE = "checks.json";

export const KINDS = ["bug", "error", "ux", "security", "performance"] as const;
export const SEVERITIES = ["high", "medium", "low"] as const;

// What the kobold reports with its tool, report_finding.
export const FINDING_INPUT = {
  title: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .describe("The problem in a few plain words a non-developer understands."),
  happens: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "What happens to a person using the product because of it, in one or two plain sentences.",
    ),
  where: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .describe(
      "Where it is: a file and line from the project's root, like shop/src/cart.ts:42.",
    ),
  kind: z
    .enum(KINDS)
    .describe(
      "bug: it does the wrong thing; error: it fails or crashes; ux: hard to use or to reach (accessibility too); security: data or access at risk; performance: slow or heavy.",
    ),
  severity: z
    .enum(SEVERITIES)
    .describe(
      "high: people lose work, money or data, or cannot do the main thing; medium: they can, with trouble; low: a rough edge.",
    ),
  suggestion: z
    .string()
    .trim()
    .max(600)
    .default("")
    .describe("What would fix it, in a sentence; empty when not clear."),
};
export type FindingInput = z.infer<z.ZodObject<typeof FINDING_INPUT>>;

const findingSchema = z.object({
  ...FINDING_INPUT,
  id: z.string(),
  // Open until a person acts on it: sent to Build (as a fix ticket, when the
  // board could make one) or not a problem.
  status: z.enum(["open", "sent", "dismissed"]),
  issue: z.number().int().positive().nullable().default(null),
  // Found by the last check, not by one before it.
  fresh: z.boolean().default(false),
});
export type Finding = z.infer<typeof findingSchema>;

const checkSchema = z.object({
  product: z.string(),
  // The kobold's job that does it.
  job: z.string(),
  started: z.string(),
  ended: z.string().nullable(),
  state: z.enum(["running", "done", "stopped", "failed"]),
  // What the kobold said at the end, or why it could not.
  said: z.string().nullable(),
  // Everything found so far, by this check and the ones before it.
  findings: z.array(findingSchema),
  // What the running check has found, until it ends.
  incoming: z.array(findingSchema).default([]),
  // How many the last check found and kept, counted here (never the
  // kobold's own count).
  kept: z.number().int().min(0).default(0),
});
export type Check = z.infer<typeof checkSchema>;

const fileSchema = z.object({ checks: z.array(checkSchema) });

// The checks kept for the project, in the factory's folder.
export class ChecksFile {
  private readonly file: string;
  private readonly root: string;

  constructor(project: string) {
    this.root = join(project, FACTORY_FOLDER);
    this.file = join(this.root, FILE);
  }

  // The last check of each product; none when the file is missing or does
  // not fit (it is then started afresh).
  all(): Check[] {
    if (!existsSync(this.file)) return [];
    try {
      const read = fileSchema.safeParse(
        JSON.parse(readFileSync(this.file, "utf8")),
      );
      return read.success ? read.data.checks : [];
    } catch {
      return [];
    }
  }

  of(product: string): Check | null {
    return this.all().find((one) => one.product === product) ?? null;
  }

  // A new check of a product: what was found before stays as it is (and
  // when the last check ended) until it ends.
  started(product: string, job: string): Check {
    const before = this.of(product);
    const check: Check = {
      product,
      job,
      started: new Date().toISOString(),
      ended: before?.ended ?? null,
      state: "running",
      said: null,
      findings: before?.findings ?? [],
      incoming: [],
      kept: before?.kept ?? 0,
    };
    this.save([...this.all().filter((one) => one.product !== product), check]);
    return check;
  }

  // A check ended: what it found joins what was found before, marked new.
  ended(product: string, how: Pick<Check, "state" | "said">): Check {
    return this.change(product, (check) => ({
      ...check,
      ...how,
      ended: new Date().toISOString(),
      findings: [
        ...check.findings.map((one) => ({ ...one, fresh: false })),
        ...check.incoming.map((one) => ({ ...one, fresh: true })),
      ],
      incoming: [],
      kept: check.incoming.length,
    }));
  }

  // Changes the check of a product, refused when there is none.
  change(product: string, how: (check: Check) => Check): Check {
    const check = this.of(product);
    if (!check) throw new Refused(`There is no check-up of “${product}”.`);
    const changed = how(check);
    this.save(
      this.all().map((one) => (one.product === product ? changed : one)),
    );
    return changed;
  }

  // A finding the kobold reported, kept open with the running check's.
  found(product: string, input: FindingInput): Finding {
    const finding: Finding = {
      ...input,
      id: randomUUID(),
      status: "open",
      issue: null,
      fresh: true,
    };
    this.change(product, (check) => ({
      ...check,
      incoming: [...check.incoming, finding],
    }));
    return finding;
  }

  // Written whole to a file beside it, then put in its place, so a check
  // is never half written.
  private save(checks: Check[]): void {
    this.ignored();
    const next = `${this.file}.${String(process.pid)}.tmp`;
    writeFileSync(next, `${JSON.stringify({ checks }, null, 2)}\n`);
    renameSync(next, this.file);
  }

  // The factory's .gitignore names the file, once.
  private ignored(): void {
    const ignore = join(this.root, ".gitignore");
    const lines = existsSync(ignore)
      ? readFileSync(ignore, "utf8").split(/\r?\n/)
      : [];
    if (lines.some((line) => line.trim() === FILE)) return;
    const last = lines.at(-1);
    appendFileSync(
      ignore,
      `${last === undefined || last === "" ? "" : "\n"}${FILE}\n`,
    );
  }
}

// Whether two findings are the same problem: at the same place, or with
// the same title in the same file (a later check may cite another line).
export function alike(
  one: Pick<Finding, "where" | "title">,
  other: Pick<Finding, "where" | "title">,
): boolean {
  const a = placeOf(one.where);
  const b = placeOf(other.where);
  if (a.file !== b.file) return false;
  return a.line === b.line || sameWords(one.title, other.title);
}

function sameWords(a: string, b: string): boolean {
  const words = (text: string) => text.trim().toLowerCase().split(/\s+/);
  return words(a).join(" ") === words(b).join(" ");
}
