// A product: one of the company's apps or services, which the factory works
// on. Each describes itself in a product.json in its own folder, so the
// factory knows it without the core naming it: its kind (which picks the kit
// that knows how to start, check and prototype it), who uses it, and its
// commands. Its promises and structure stay in its BLUEPRINT.md.

import { readFileSync } from "node:fs";
import { dirname } from "node:path";

import { z } from "zod";

const command = z.string().min(1);

export const productSchema = z.object({
  // Short and stable: used in branches, addresses and ids ("shop-app").
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase letters, digits and -"),
  // What people call it ("Shop").
  name: z.string().min(1),
  // The kind of product, which a kit knows ("expo-app", "react-web-app").
  kind: z.string().regex(/^[a-z][a-z0-9-]*$/),
  // What it is for, in a sentence.
  about: z.string().min(1),
  // Who uses it, in the company's words: the coach picks the product for a
  // screen from who uses that screen.
  users: z
    .array(z.object({ who: z.string().min(1), does: z.string().min(1) }))
    .min(1),
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
});

export type ProductFile = z.infer<typeof productSchema>;

// A product as the factory knows it: its description and its folder.
export type Product = ProductFile & { folder: string };

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
  return { product: { ...parsed.data, folder: dirname(file) } };
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
