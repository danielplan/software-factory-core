// How the factory is extended. An extension adds abilities to the factory
// (a tab, a tracker); a kit teaches it one kind of product (an Expo
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
// core skills' own.
const guideSchema = z.object({
  agent: id,
  title: z.string().min(1),
  file: z.string().min(1),
});

// What an extension brings the factory, by id: the pages it adds to the
// sidebar (the dashboard's page ids), the blocks it offers Home, the kobolds
// that work for it, and the stages of work it takes part in. Their names are
// words, kept in the dashboard by id.
const bringsSchema = z.object({
  pages: z.array(id).default([]),
  blocks: z.array(id).default([]),
  kobolds: z.array(id).default([]),
  stages: z.array(id).default([]),
});

// How a page or a Home block of an extension looks: a few parts one under
// the other, drawn by Kobble's page in its own look, so nothing a team writes
// can change how the page works. A part is some words, or a list of items
// (written here, or kept in a file of the extension's own folder, which the
// extension's kobold keeps up to date).
export const VIEW_ICONS = [
  "puzzle",
  "list",
  "check",
  "flag",
  "calendar",
  "chart",
  "note",
  "star",
] as const;

const itemSchema = z.object({
  title: z.string().min(1),
  about: z.string().optional(),
  // A small word beside it ("late", "ready").
  tag: z.string().optional(),
});

const viewPartSchema = z.discriminatedUnion("show", [
  z.object({
    show: z.literal("text"),
    title: z.string().optional(),
    text: z.string().min(1),
  }),
  z.object({
    show: z.literal("list"),
    title: z.string().optional(),
    items: z.array(itemSchema).default([]),
    // A JSON file in the extension's folder with more items (a list of
    // objects like these), read each time the page is shown.
    from: z.string().min(1).optional(),
    // What shows when the list has nothing in it.
    empty: z.string().optional(),
  }),
]);

const viewSchema = z.object({
  id,
  name: z.string().min(1),
  about: z.string().optional(),
  icon: z.enum(VIEW_ICONS).default("puzzle"),
  parts: z.array(viewPartSchema).min(1),
});

// Where a stage of work sits among the others: it names its neighbours, by
// stage id, and the factory works out the order (stages.ts). A neighbour
// that is not installed is not a problem: the others around it still hold.
const stageSchema = z.object({
  id,
  name: z.string().min(1),
  after: z.array(id).default([]),
  before: z.array(id).default([]),
});

// The jobs the factory itself fills once, for every extension: where the
// code lives and where the tasks are kept. Only the core defines them.
export const SLOTS = ["code", "tasks"] as const;
export type Slot = (typeof SLOTS)[number];

export const extensionSchema = z.object({
  id,
  name: z.string().min(1),
  about: z.string().min(1),
  // Ships with the core and is on unless the company switches it off.
  core: z.boolean().default(false),
  // A place where work is tracked (a GitHub board, Jira): the company's
  // tracker names one.
  tracker: z.boolean().default(false),
  // The slots it can fill (a tracker fills "tasks" without saying so). Only
  // Kobble's own extensions fill one.
  fills: z.array(z.enum(SLOTS)).default([]),
  // Needed in every factory: it cannot be removed (Factory builds everything).
  always: z.boolean().default(false),
  // The other extensions it needs, by id: installing it brings them,
  // and one that others need cannot be removed.
  needs: z.array(id).default([]),
  // The slots it uses (a connection every extension shares).
  slots: z.array(z.enum(SLOTS)).default([]),
  brings: bringsSchema.default({
    pages: [],
    blocks: [],
    kobolds: [],
    stages: [],
  }),
  // The pages and Home blocks it describes (a team's own; Kobble's draw theirs
  // in code) and the stages it adds, with the places it suggests for them.
  pages: z.array(viewSchema).default([]),
  blocks: z.array(viewSchema).default([]),
  stages: z.array(stageSchema).default([]),
  // The factory's own programs this extension runs.
  parts: z.array(partSchema).default([]),
  settings: z.array(settingGroupSchema).default([]),
  guides: z.array(guideSchema).default([]),
});

// An MCP server the agents use on a product of a kind (its framework's
// documentation and checks): run on this computer, or reached at an address.
const mcpServerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
  }),
  z.object({ type: z.literal("http"), url: z.url() }),
]);

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
  // The folder of the kit's own starter (an absolute path): a whole empty
  // product of this kind with the kit's standards, checks and prototype
  // mode. A new product starts as a copy of it, given the product's name
  // (extensions/starter.ts); `create` then finishes it.
  starter: z.string().min(1).optional(),
  guides: z.array(guideSchema).default([]),
  // The MCP servers the agents use on such a product, by name: written into
  // the project's .mcp.json when a product of this kind is added.
  mcp: z.record(id, mcpServerSchema).default({}),
  // Recognises any code, so it only takes a folder in which no other kit
  // finds a product, there or below (setup/detect.ts).
  fallback: z.boolean().default(false),
});

export type Guide = z.infer<typeof guideSchema>;
export type View = z.infer<typeof viewSchema>;
type ViewPart = z.infer<typeof viewPartSchema>;
export type ViewItem = z.infer<typeof itemSchema>;
export type StageSpec = z.infer<typeof stageSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;
export type ExtensionFile = z.input<typeof extensionSchema>;
export type Extension = z.infer<typeof extensionSchema>;

// What a kit recognises in a folder of existing code: a name for the
// product, the commands that are already there, and where it answers.
export type Detected = {
  name: string;
  commands: Product["commands"];
  port?: number;
};

// A kit's code: the parts that run a product of its kind, whether a folder
// of existing code is such a product, and how to make a new one.
type KitCode = {
  partsFor: (product: Product) => Part[];
  detect: (folder: string) => Detected | null;
  // The commands that make a new product in `folder`, run one after the
  // other in the folder's parent: with a starter, they finish the copy of it
  // already in `folder` (install its packages); without one, `folder` does
  // not exist yet and they make it with the framework's own generator. Null
  // when the kit cannot make one.
  create: ((folder: string, name: string) => string[][]) | null;
  // Where a product of this kind usually answers.
  port?: number;
};

export type Kit = z.infer<typeof kitSchema> & KitCode;

export type KitFile = z.input<typeof kitSchema> & Partial<KitCode>;

// An extension, checked: a mistake shows when the factory starts, with the
// extension's id, not later as something odd on a screen.
export function defineExtension(spec: ExtensionFile): Extension {
  const parsed = extensionSchema.safeParse(spec);
  if (!parsed.success)
    throw new Error(
      `The extension "${spec.id}" is not right: ${z.prettifyError(parsed.error)}`,
    );
  return withBrought(parsed.data);
}

// What an extension describes (a page, a block, a stage) is brought too: it
// need not be said twice.
export function withBrought(extension: Extension): Extension {
  const joined = (ids: string[], more: { id: string }[]) => [
    ...new Set([...ids, ...more.map((one) => one.id)]),
  ];
  const { brings } = extension;
  return {
    ...extension,
    brings: {
      ...brings,
      pages: joined(brings.pages, extension.pages),
      blocks: joined(brings.blocks, extension.blocks),
      stages: joined(brings.stages, extension.stages),
    },
  };
}

export function defineKit(spec: KitFile): Kit {
  const parsed = kitSchema.safeParse(spec);
  if (!parsed.success)
    throw new Error(
      `The kit "${spec.id}" is not right: ${z.prettifyError(parsed.error)}`,
    );
  return {
    ...parsed.data,
    partsFor: spec.partsFor ?? (() => []),
    detect: spec.detect ?? (() => null),
    create: spec.create ?? null,
    ...(spec.port ? { port: spec.port } : {}),
  };
}
