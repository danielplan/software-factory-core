// The skills (plan, build test-first, review, show, remember) put
// where the coding agents in the project find them: Claude Code's
// .claude/skills and Codex's .agents/skills. So planning and building with
// the factory's skills work in a coding agent too, not only in the
// factory's own pages. The factory owns these skills: each upgrade replaces
// them as a whole, so nobody edits them in a project. A company's own
// conventions and lessons go in its knowledge base, which the skills read.
// A project's own skill with the same name is moved aside into the factory
// folder (replaced-skills/), so its lessons can be carried into the
// knowledge base, and the factory's takes its place.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

// Where each coding agent looks for a project's skills.
export const SKILL_FOLDERS = [
  join(".claude", "skills"),
  join(".agents", "skills"),
];
// Marks a skill folder as the factory's.
const MARK = ".from-software-factory";

export const REPLACED_FOLDER = "replaced-skills";
const MARK_TEXT = `Put here by the software factory and replaced as a whole at every upgrade: do not edit it here.
Your own conventions and lessons go in the knowledge base (docs/reference/conventions/ and docs/reference/lessons/), which the skills read.
`;

// The skills put in place, as "folder/name".
export function installSkills(project: string, from = skillsFolder): string[] {
  const skills = readdirSync(from, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return SKILL_FOLDERS.flatMap((folder) =>
    skills.flatMap((name) => {
      const target = join(project, folder, name);
      if (existsSync(target) && !existsSync(join(target, MARK)))
        moveAside(project, folder, name);
      rmSync(target, { recursive: true, force: true });
      cpSync(join(from, name), target, { recursive: true });
      writeFileSync(join(target, MARK), MARK_TEXT);
      return [join(folder, name)];
    }),
  );
}

// A project's own skill with a factory skill's name, kept in the factory
// folder (replaced-skills/claude/plan, replaced-skills/agents/plan).
function moveAside(project: string, folder: string, name: string): void {
  const agent = folder.startsWith(".claude") ? "claude" : "agents";
  const kept = join(project, FACTORY_FOLDER, REPLACED_FOLDER, agent, name);
  if (existsSync(kept)) rmSync(kept, { recursive: true, force: true });
  mkdirSync(dirname(kept), { recursive: true });
  renameSync(join(project, folder, name), kept);
}
