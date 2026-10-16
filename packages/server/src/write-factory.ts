// The project's factory folder from the dashboard's setup steps: the
// company first (the folder, and the project's rules pointing to it), then products (found in existing code, or about to be
// made) whenever the owner adds them, with the kits their kinds need.

import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  addProduct,
  createFactoryFolder,
  FACTORY_FOLDER,
  findProducts,
  hasFactory,
  type Kit,
  pointToFactory,
  readCompany,
  saveCompany,
  type Templates,
} from "@software-factory/core";

import type { CreateCompany, Draft, SetupProduct } from "./api.ts";
import { Refused } from "./refused.ts";

// The factory folder made in the project; its path.
export function writeCompany(
  request: CreateCompany,
  project: string,
  templates: Templates,
): string {
  const name = request.name.trim();
  if (!name) throw new Refused("Give the project a name.");
  const root = join(project, FACTORY_FOLDER);
  if (hasFactory(root))
    throw new Refused(`There is a factory in ${root} already.`);
  createFactoryFolder(root, { name, about: request.about }, templates);
  pointToFactory(project);
  return root;
}

// The products' descriptions, and the kits their kinds need added to the
// company file. Refused as a whole when one does not fit.
export function writeProducts(
  root: string,
  products: SetupProduct[],
  kits: Kit[],
): void {
  if (products.length === 0) throw new Refused("Choose a product to add.");
  const taken = new Set(findProducts(root).products.map((p) => p.id));
  const kinds = new Set(products.map((p) => p.kind));
  for (const product of products)
    if (taken.has(product.id))
      throw new Refused(`There is a product "${product.id}" already.`);
  for (const kind of kinds)
    if (!kits.some((kit) => kit.kind === kind))
      throw new Refused(`No kit knows a ${kind}.`);
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) throw new Refused(read.problem);
  const used = new Set([
    ...read.company.kits,
    ...kits.filter((kit) => kinds.has(kit.kind)).map((kit) => kit.id),
  ]);
  saveCompany(root, { ...read.company, kits: [...used] });
  for (const product of products)
    addProduct(
      root,
      {
        id: product.id,
        name: product.name,
        kind: product.kind,
        folder: product.folder,
        about: product.about,
        users: product.users ?? [],
        commands: product.commands ?? {},
        dependsOn: product.dependsOn ?? [],
        ...(product.port ? { port: product.port } : {}),
      },
      product.blueprint,
    );
}

// The context drafted in setup, as the knowledge base's first explanation
// page (context/explanation/the-project.md), linked from its index: one
// section per area, a line per card with where its arrows lead, and its
// picture. A guess the owner did not confirm says so.
export function writeContext(root: string, draft: Draft): void {
  const cards = draft.things.flatMap((t) => (t.kind === "card" ? [t] : []));
  const { company } = draft;
  if (cards.length === 0 && !company.about) return;
  const titles = new Map(cards.map((card) => [card.id, card.title]));
  const areas = [...new Set(cards.map((card) => card.area))];
  const sections = areas.map((area) =>
    [
      `## ${area}`,
      cards
        .filter((card) => card.area === area)
        .map((card) => cardLine(card, draft.links, titles))
        .join("\n"),
    ].join("\n\n"),
  );
  const page = [
    `# ${company.name}`,
    "[Knowledge base](../index.md) · [Explanation](index.md)",
    "**Type:** Explanation · Answers: what is this project, how real is it, and what must never happen?",
    ...(company.about ? [company.about] : []),
    ...sections,
    "Written when the factory was set up, from the code and the owner's answers. Each run keeps it true.",
  ].join("\n\n");
  const folder = join(root, "context", "explanation");
  writeFileSync(join(folder, "the-project.md"), page + "\n");
  appendFileSync(
    join(folder, "index.md"),
    `\n- [${company.name}](the-project.md): what the project is and the context around it, as set up.\n`,
  );
}

type Card = Extract<Draft["things"][number], { kind: "card" }>;

const TONES = { rule: "Rule:", question: "Open:" } as const;

// "- **Title**: its text → where its arrows lead", with its picture (by
// its place in the project, three folders up from the page), marked when
// it is still a guess.
function cardLine(
  card: Card,
  links: Draft["links"],
  titles: Map<string, string>,
): string {
  const text = card.text ? `: ${card.text}` : "";
  const next = links
    .filter((link) => link.from === card.id)
    .map(
      (link) =>
        (link.label ? `${link.label} ` : "") + (titles.get(link.to) ?? link.to),
    );
  const leads = next.length > 0 ? ` → ${next.join(", ")}` : "";
  const picture = card.picture
    ? ` ![${card.title}](../../../${card.picture})`
    : "";
  const guess = card.confirmed ? "" : " *(guessed from the code)*";
  const tone = card.tone ? `${TONES[card.tone]} ` : "";
  return `- ${tone}**${card.title}**${text}${leads}${picture}${guess}`;
}
