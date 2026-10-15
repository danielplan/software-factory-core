// How the factory is extended. An extension adds abilities to the factory
// (a tab, the GitHub runner); a kit teaches it one kind of product (an Expo
// app): the usual commands, the parts that run such a product, and the rules
// the agents follow when they work on one. Both say what they add through the
// same few extension points, and use only what the core exports.

import { z } from "zod";

import { productSchema, type Product } from "../products/product.ts";
import { partSchema, type Part } from "../parts/part.ts";
import { settingGroupSchema } from "../settings/setting-groups.ts";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);

// A piece of an agent's instructions: a Markdown file that is joined to what
// that agent reads (the coach, the prototype maker, the builder), after the
// core method's own.
const guideSchema = z.object({
  agent: id,
  title: z.string().min(1),
  file: z.string().min(1),
});

export const extensionSchema = z.object({
  id,
  name: z.string().min(1),
  about: z.string().min(1),
  // Ships with the core and is on unless the company switches it off.
  core: z.boolean().default(false),
  // The factory's own programs this extension runs.
  parts: z.array(partSchema).default([]),
  settings: z.array(settingGroupSchema).default([]),
  guides: z.array(guideSchema).default([]),
});

export const kitSchema = z.object({
  id,
  name: z.string().min(1),
  about: z.string().min(1),
  // The kind of product it knows (what a product.json says as its kind).
  kind: id,
  // The commands a product of this kind usually has; the product's own win.
  commands: productSchema.shape.commands,
  // The rules for working on such a product: Markdown files the agents read
  // (conventions and lessons for the kind).
  rules: z.array(z.string().min(1)).default([]),
  guides: z.array(guideSchema).default([]),
});

export type Guide = z.infer<typeof guideSchema>;
export type ExtensionFile = z.input<typeof extensionSchema>;
export type Extension = z.infer<typeof extensionSchema>;

// A kit also makes the parts that run each product of its kind.
export type Kit = z.infer<typeof kitSchema> & {
  partsFor: (product: Product) => Part[];
};

export type KitFile = z.input<typeof kitSchema> & {
  partsFor?: (product: Product) => Part[];
};

// An extension, checked: a mistake shows when the factory starts, with the
// extension's id, not later as something odd on a screen.
export function defineExtension(spec: ExtensionFile): Extension {
  const parsed = extensionSchema.safeParse(spec);
  if (!parsed.success)
    throw new Error(
      `The extension "${spec.id}" is not right: ${z.prettifyError(parsed.error)}`,
    );
  return parsed.data;
}

export function defineKit(spec: KitFile): Kit {
  const parsed = kitSchema.safeParse(spec);
  if (!parsed.success)
    throw new Error(
      `The kit "${spec.id}" is not right: ${z.prettifyError(parsed.error)}`,
    );
  return { ...parsed.data, partsFor: spec.partsFor ?? (() => []) };
}
