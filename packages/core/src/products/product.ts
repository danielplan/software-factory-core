// A product: one of the company's apps or services, which the factory works
// on. Each is described in a product.json next to its code (listed in the
// company file), so the factory knows it without the core naming it: its
// kind (which picks the kit that knows how to start, check and prototype it),
// who uses it, and its commands. Its promises and structure are in the
// BLUEPRINT.md next to it.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { z } from "zod";

const command = z.string().min(1);

export const productSchema = z.object({
  // Short and stable: used in branches, addresses and ids ("shop-app").
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase letters, digits and -"),
  // What people call it ("Shop").
  name: z.string().min(1),
  // The kind of product, which a kit knows ("expo-app", "react-web-app").
  kind: z.string().regex(/^[a-z][a-z0-9-]*$/),
  // Where its code is: a folder, from this file's folder or absolute; the
  // file's own folder when it sits next to the code (from 0.6.0 on).
  code: z.string().min(1).default("."),
  // What it is for, in a sentence (empty until someone says).
  about: z.string().default(""),
  // Who uses it, in the company's words: the coach picks the product for a
  // screen from who uses that screen.
  users: z
    .array(z.object({ who: z.string().min(1), does: z.string().min(1) }))
    .default([]),
  // Where it answers while it runs on this computer, when it answers at all.
  port: z.number().int().min(1024).max(65535).optional(),
  // The commands the factory runs in the product's folder; a kit gives the
  // usual ones for its kind, the product says only what differs.
  commands: z
    .object({
      verify: command,
      start: command,
      prototype: command,
      prototypeLive: command,
    })
    .partial()
    .default({}),
  // The products it needs running (a phone app needs its backend).
  dependsOn: z.array(z.string()).default([]),
  // Settings it gets in a working copy of the factory, so a copy runs on
  // its own ports and with its own data, beside the owner's: "{port:<id>}"
  // is that product's port in the copy, "{copy}" the copy's folder, "{data}"
  // a folder for its own data outside its code (a database's files).
  copyEnv: z.record(z.string(), z.string()).default({}),
});

export type ProductFile = z.infer<typeof productSchema>;
// A product as it is given, before the defaults are filled in.
export type ProductInput = z.input<typeof productSchema>;

// A product as the factory knows it: its description, the folder of its code
// and the folder its description is in.
export type Product = ProductFile & { folder: string; home: string };

// The product described in this product.json, or why it cannot be read.
export function readProduct(
  file: string,
): { product: Product } | { problem: string } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    return { problem: `${file} cannot be read: ${messageOf(error)}` };
  }
  const parsed = productSchema.safeParse(data);
  if (!parsed.success)
    return { problem: `${file}: ${z.prettifyError(parsed.error)}` };
  const home = dirname(file);
  return {
    product: { ...parsed.data, folder: resolve(home, parsed.data.code), home },
  };
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
