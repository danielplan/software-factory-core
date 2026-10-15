// The company file (factory.json, at the root of a company's repository):
// the company's name, where its products are, and which extensions and kits
// its factory uses. Everything else about the company lives in its own
// folders: its products, its knowledge (context/) and its history (runs/).

import { readFileSync } from "node:fs";

import { z } from "zod";

import { messageOf } from "../products/product.ts";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);

export const companySchema = z.object({
  name: z.string().min(1),
  // Where the product folders are, as glob patterns from the root; each
  // folder that has a product.json is a product.
  products: z.array(z.string().min(1)).default(["*"]),
  // The add-ons the factory uses, by id; the core extensions are on anyway.
  extensions: z.array(id).default([]),
  // Core extensions the company switches off.
  without: z.array(id).default([]),
  // The kits, one per kind of product the company has.
  kits: z.array(id).default([]),
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
