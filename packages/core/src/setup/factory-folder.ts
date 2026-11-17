// Makes a project's factory folder (`factory/`, in the project's code): the
// company file, the history and the agents' ground rules from the skills
// package's template; the knowledge base goes into the project's docs/ (beside
// the docs it has), and each product is described next to its code. The
// project's own AGENTS.md (and CLAUDE.md) point to the factory.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import {
  COMPANY_FILE,
  type Company,
  companySchema,
} from "../company/company.ts";
import { PRODUCT_FILE } from "../products/find-products.ts";
import { type ProductInput, productSchema } from "../products/product.ts";
import { CORE_VERSION } from "../version.ts";

// Where the starting files come from: the knowledge base's template folder
// (with context/ in it) and the skills package's AGENTS.md template.
export type Templates = { knowledgeBase: string; agents: string };

// The folder in a project that holds its factory.
export const FACTORY_FOLDER = "factory";

// The folder in a project that holds what it knows: its own docs and the
// factory's knowledge base, as one space.
export const DOCS_FOLDER = "docs";

// The knowledge base of the factory at root (its project's docs/).
export function knowledgeBaseOf(root: string): string {
  return join(dirname(root), DOCS_FOLDER);
}

export function hasFactory(root: string): boolean {
  return existsSync(join(root, COMPANY_FILE));
}

// The factory of the project around `start`: the nearest factory folder
// looking upward, or null when there is none.
export function findFactory(start: string): string | null {
  const project = upward(start, (folder) =>
    hasFactory(join(folder, FACTORY_FOLDER)),
  );
  return project && join(project, FACTORY_FOLDER);
}

// The project around `start`, for setting one up: the top of its git
// repository, or `start` itself when git does not keep it.
export function projectOf(start: string): string {
  return upward(start, (folder) => existsSync(join(folder, ".git"))) ?? start;
}

// The nearest folder from `start` upward that fits.
function upward(start: string, fits: (folder: string) => boolean) {
  let folder = resolve(start);
  for (;;) {
    if (fits(folder)) return folder;
    const parent = dirname(folder);
    if (parent === folder) return null;
    folder = parent;
  }
}

// A new factory folder; refused where one is already.
export function createFactoryFolder(
  root: string,
  company: { name: string; about?: string; tracker?: Company["tracker"] },
  templates: Templates,
): Company {
  if (hasFactory(root))
    throw new Error(`There is a factory in ${root} already.`);
  const file = companySchema.parse({
    ...company,
    core: CORE_VERSION,
    products: [],
  });
  mkdirSync(root, { recursive: true });
  writeJson(join(root, COMPANY_FILE), file);
  // The knowledge base's folders beside the project's own docs, never over them.
  cpSync(join(templates.knowledgeBase, "context"), knowledgeBaseOf(root), {
    recursive: true,
    force: false,
  });
  mkdirSync(join(root, "runs"), { recursive: true });
  writeFileSync(
    join(root, "runs", "README.md"),
    "# Runs\n\nOne file per piece of work, `NNN-short-name.md`, numbered in order.\n",
  );
  writeFileSync(
    join(root, "AGENTS.md"),
    readFileSync(templates.agents, "utf8").replaceAll("<company>", file.name),
  );
  writeFileSync(join(root, ".gitignore"), "copies/\nsettings/\n");
  return file;
}

const POINTER = `## Software factory

This project is built with a software factory. Its rules, its workflow and what it knows are in \`${FACTORY_FOLDER}/\`: read \`${FACTORY_FOLDER}/AGENTS.md\` before you build or change something.
`;
const IMPORT = `@${FACTORY_FOLDER}/AGENTS.md`;

// The project's own AGENTS.md and CLAUDE.md point to its factory's rules:
// made when there are none, added to the end when they say nothing of it.
export function pointToFactory(project: string): void {
  addOnce(join(project, "AGENTS.md"), POINTER, `${FACTORY_FOLDER}/AGENTS.md`);
  addOnce(
    join(project, "CLAUDE.md"),
    `@AGENTS.md\n${IMPORT}\n`,
    IMPORT,
    `${IMPORT}\n`,
  );
}

function addOnce(file: string, fresh: string, mark: string, more = fresh) {
  if (!existsSync(file)) {
    writeFileSync(file, fresh);
    return;
  }
  const text = readFileSync(file, "utf8");
  if (text.includes(mark)) return;
  writeFileSync(file, `${text.trimEnd()}\n\n${more}`);
}

// The company file changed (its tracker, its kits): written back whole.
export function saveCompany(root: string, company: Company): void {
  writeJson(join(root, COMPANY_FILE), companySchema.parse(company));
}

// A product's description next to its code, with its first blueprint (the one
// given, drafted from the code, or a placeholder), listed in the company file.
// A folder inside the project is listed from the project's root, so the
// project can move; one elsewhere keeps its whole path.
export function addProduct(
  root: string,
  product: Omit<ProductInput, "code"> & { folder: string },
  blueprint?: string,
): string {
  const { folder, ...rest } = product;
  const home = resolve(folder);
  if (existsSync(join(home, PRODUCT_FILE)))
    throw new Error(`There is a product in ${folder} already.`);
  const file = productSchema.parse(rest);
  writeJson(join(home, PRODUCT_FILE), file);
  listProduct(root, home);
  writeFileSync(
    join(home, "BLUEPRINT.md"),
    blueprint?.trim()
      ? `${blueprint.trim()}\n`
      : `# ${file.name} blueprint\n\n- **Kind:** ${file.kind}.\n- **Code:** ${folder}.\n- **Structure, promises and checks:** to be written (the factory drafts them from the code for you to review).\n`,
  );
  return home;
}

// The product's folder in the company file's list.
function listProduct(root: string, folder: string): void {
  const project = dirname(root);
  const inside = !relative(project, folder).startsWith(`..${sep}`);
  const named = inside ? relative(project, folder) || "." : folder;
  const company = companySchema.parse(
    JSON.parse(readFileSync(join(root, COMPANY_FILE), "utf8")),
  );
  const products = company.products ?? [];
  if (!products.includes(named))
    saveCompany(root, { ...company, products: [...products, named] });
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
