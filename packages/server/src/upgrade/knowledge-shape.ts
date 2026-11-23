// The knowledge base keeps its shape (from 0.14.1): a project's docs/ that
// lacks a page of it (the index, a section's index, how the knowledge base
// is kept) gets that page from the template, as a new company's starts.
// Nothing there is overwritten; a docs/ that is not there yet comes with
// the 0.6.0 migration.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { knowledgeBaseOf } from "@software-factory/core";
import { SKELETON, templateFolder } from "@software-factory/knowledge-base";

import type { Migrated } from "./migrations.ts";

export function knowledgeShape(root: string): Migrated {
  const docs = knowledgeBaseOf(root);
  if (!existsSync(docs)) return { done: [], left: [] };
  const added = SKELETON.filter((page) => !existsSync(join(docs, page)));
  for (const page of added) {
    mkdirSync(dirname(join(docs, page)), { recursive: true });
    copyFileSync(join(templateFolder, "context", page), join(docs, page));
  }
  if (added.length === 0) return { done: [], left: [] };
  const named = added.map((page) => `docs/${page}`).join(", ");
  return {
    done: [
      `The knowledge base gets the pages of its shape it lacked: ${named}.`,
    ],
    left: [
      "Link each new section index from the page above it (docs/index.md, docs/reference/index.md) and fill the sections as the work goes: the builder does it with the update-context skill, and the knowledge base's checks say what is still missing.",
    ],
  };
}
