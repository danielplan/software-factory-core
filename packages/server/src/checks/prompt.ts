// What the kobold is told for a check-up of one product: which product,
// where its code is, and in which language to write what it finds. How to
// look, and what to report, is in the check skill.

import { relative } from "node:path";

import type { Product } from "@software-factory/core";

// The dashboard's languages: the findings are written in the person's.
export const LANGUAGES = {
  en: "English",
  it: "Italian",
  de: "German",
  fr: "French",
  es: "Spanish",
} as const;
export type Language = keyof typeof LANGUAGES;

export function checkPrompt(
  product: Pick<Product, "id" | "name" | "kind" | "about" | "folder">,
  project: string,
  language: Language = "en",
): string {
  const folder = relative(project, product.folder) || ".";
  return [
    `Check the product “${product.name}” (id ${product.id}, a ${product.kind}).`,
    ...(product.about ? [`What it is: ${product.about}`] : []),
    `Its code is in ${folder}/, from the project's root, where you are.`,
    "",
    "Follow your check skill: read its code, find the problems a person using it would meet, and report each one with report_finding (product is not needed: this check is for this product only). Cite where each one is as a file and line from the project's root.",
    `Write the titles, what happens and the suggestions in ${LANGUAGES[language]}.`,
    "When you are done, say in one line what you looked at.",
  ].join("\n");
}
