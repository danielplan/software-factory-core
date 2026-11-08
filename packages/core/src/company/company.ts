// The company file (factory.json, at the root of the company's factory
// folder, on this computer): the company's name, which extensions and kits
// its factory uses, where its work is tracked, and where its products are.
// Each product describes itself next to its code (product.json, BLUEPRINT.md);
// what the company knows is in the project's docs/; the factory folder keeps
// the history (runs/).

import { readFileSync } from "node:fs";

import { z } from "zod";

import { messageOf } from "../products/product.ts";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);

export const companySchema = z.object({
  name: z.string().min(1),
  // What the company does, in a sentence or two.
  about: z.string().default(""),
  // Where its work is tracked: the factory's own board ("none"), or the id
  // of an add-on that tracks work (a GitHub board, Jira Cloud). Which board
  // is in the factory's board.json.
  tracker: id.default("none"),
  // The add-ons the factory uses, by id; the core extensions are on anyway.
  extensions: z.array(id).default([]),
  // Core extensions the company switches off.
  without: z.array(id).default([]),
  // The kits, one per kind of product the company has.
  kits: z.array(id).default([]),
  // The core's version the factory is on (version.ts); none: the first.
  core: z.string().optional(),
  // The products' folders, from the project's root ("apps/web"): each has its
  // product.json and BLUEPRINT.md. None: a factory from before 0.6.0, whose
  // products are described in its own products/ folder.
  products: z.array(z.string().min(1)).optional(),
  // How the project runs a card's prototype in its own copy of the code. The
  // core makes the copy and keeps track of it (`software-factory prototype`);
  // these commands, run in the copy, start and stop what the project needs
  // (its servers, its database, made-up data). None: the copy is made, and
  // the project's own commands are not run.
  prototype: z
    .object({
      start: z.string().min(1),
      stop: z.string().min(1).optional(),
      remove: z.string().min(1).optional(),
    })
    .optional(),
});

export type Company = z.infer<typeof companySchema>;

export const COMPANY_FILE = "factory.json";

// The company file, or why it cannot be read.
export function readCompany(
  file: string,
): { company: Company } | { problem: string } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    return { problem: `${file} cannot be read: ${messageOf(error)}` };
  }
  const parsed = companySchema.safeParse(data);
  return parsed.success
    ? { company: parsed.data }
    : { problem: `${file}: ${z.prettifyError(parsed.error)}` };
}
