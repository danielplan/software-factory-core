// The method a software factory's agents follow: the skills (one folder each,
// with its SKILL.md) and the templates a company's files start from. A
// company gets them as files, since agents read them as files.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const skillsFolder = join(import.meta.dirname, "..", "skills");
export const templatesFolder = join(import.meta.dirname, "..", "templates");

export type Skill = { name: string; description: string; file: string };

// Every skill, from the name and description in its frontmatter.
export function listSkills(folder = skillsFolder): Skill[] {
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = join(folder, entry.name, "SKILL.md");
      const head = frontmatter(readFileSync(file, "utf8"));
      return {
        name: head.get("name") ?? "",
        description: head.get("description") ?? "",
        file,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The `key: value` lines between the first two `---` lines.
function frontmatter(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return fields;
  for (const line of lines.slice(1)) {
    if (line === "---") break;
    const colon = line.indexOf(":");
    if (colon > 0)
      fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  return fields;
}
