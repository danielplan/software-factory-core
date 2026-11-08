// The method's skills (plan, build test-first, review, show, remember) put
// where the coding agents in the project find them: Claude Code's
// .claude/skills and Codex's .agents/skills. So planning and building with
// the factory's method works in a coding agent too, not only in the
// factory's own pages. A skill folder the factory put there is kept up to
// date; one of the project's own with the same name is left alone.

import { cpSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { skillsFolder } from "@software-factory/method";

// Where each coding agent looks for a project's skills.
export const SKILL_FOLDERS = [
  join(".claude", "skills"),
  join(".agents", "skills"),
];
// Marks a skill folder as the factory's.
const MARK = ".from-software-factory";

// The skills put in place, as "folder/name"; the ones left alone are not
// listed.
export function installSkills(project: string, from = skillsFolder): string[] {
  const skills = readdirSync(from, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return SKILL_FOLDERS.flatMap((folder) =>
    skills.flatMap((name) => {
      const target = join(project, folder, name);
      if (existsSync(target) && !existsSync(join(target, MARK))) return [];
      cpSync(join(from, name), target, { recursive: true });
      writeFileSync(
        join(target, MARK),
        "Put here by the software factory; it is replaced when the factory is upgraded.\n",
      );
      return [join(folder, name)];
    }),
  );
}
