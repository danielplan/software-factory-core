// Makes a company's factory folder (on this computer, outside the code):
// the company file, the knowledge base from its template, the history, the
// agents' ground rules from the method's template, and a description for
// each product.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";

import {
  COMPANY_FILE,
  type Company,
  companySchema,
} from "../company/company.ts";
import { PRODUCT_FILE, PRODUCTS_FOLDER } from "../products/find-products.ts";
import { type ProductFile, productSchema } from "../products/product.ts";

// Where the starting files come from: the knowledge base's template folder
// (with context/ in it) and the method's AGENTS.md template.
export type Templates = { knowledgeBase: string; agents: string };

export function hasFactory(root: string): boolean {
  return existsSync(join(root, COMPANY_FILE));
}

// A new factory folder; refused where one is already.
export function createFactoryFolder(
  root: string,
  company: { name: string; about?: string; tracker?: Company["tracker"] },
  templates: Templates,
): Company {
  if (hasFactory(root))
    throw new Error(`There is a factory in ${root} already.`);
  const file = companySchema.parse(company);
  mkdirSync(root, { recursive: true });
  writeJson(join(root, COMPANY_FILE), file);
  cpSync(join(templates.knowledgeBase, "context"), join(root, "context"), {
    recursive: true,
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
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");
  writeFileSync(join(root, ".gitignore"), "copies/\nsettings/\n");
  return file;
}

// The company file changed (its tracker, its kits): written back whole.
export function saveCompany(root: string, company: Company): void {
  writeJson(join(root, COMPANY_FILE), companySchema.parse(company));
}

// A product's description, with a first blueprint next to it. Code inside
// the factory folder or next to it is kept as a relative path, so the folders
// can move together; code elsewhere keeps its whole path.
export function addProduct(
  root: string,
  product: Omit<ProductFile, "code"> & { folder: string },
): string {
  const home = join(root, PRODUCTS_FOLDER, product.id);
  if (existsSync(join(home, PRODUCT_FILE)))
    throw new Error(`There is a product "${product.id}" already.`);
  const { folder, ...rest } = product;
  const near = !relative(root, folder).startsWith(`..${sep}..`);
  const file = productSchema.parse({
    ...rest,
    code: near ? relative(home, folder) : folder,
  });
  writeJson(join(home, PRODUCT_FILE), file);
  writeFileSync(
    join(home, "BLUEPRINT.md"),
    `# ${file.name} blueprint\n\n- **Kind:** ${file.kind}.\n- **Code:** ${folder}.\n- **Structure, promises and checks:** to be written (the factory drafts them from the code for you to review).\n`,
  );
  return home;
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
