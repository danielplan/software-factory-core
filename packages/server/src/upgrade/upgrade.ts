// Brings a company's factory to the core it runs on: the migrations of every
// release after the factory's version, in order; then what the factory owns
// in the project, refreshed every time (the method's skills, the kits' MCP
// servers); the new version in factory.json; and the factory's checks.

import { join } from "node:path";

import {
  compareVersions,
  CORE_VERSION,
  FIRST_VERSION,
  loadFactory,
  saveCompany,
} from "@software-factory/core";
import { checkDocs } from "@software-factory/knowledge-base";

import { installSkills } from "../install-skills.ts";
import { addKitServers } from "../kit-servers.ts";
import { pinCore } from "../pin-core.ts";
import { themeProblems } from "../theme-check.ts";
import {
  companyOf,
  type Migration,
  MIGRATIONS,
  type UpgradeContext,
} from "./migrations.ts";

export type Upgraded = {
  from: string;
  to: string;
  done: string[];
  left: string[];
  problems: string[];
};

export async function upgradeFactory(
  context: UpgradeContext,
  to = CORE_VERSION,
  migrations: Migration[] = MIGRATIONS,
): Promise<Upgraded> {
  const { project, root, kits } = context;
  const from = companyOf(root).core ?? FIRST_VERSION;
  const due = migrations.filter(
    (m) =>
      compareVersions(m.version, from) > 0 &&
      compareVersions(m.version, to) <= 0,
  );
  const done: string[] = [];
  const left: string[] = [];
  for (const migration of due) {
    const result = migration.run(context);
    done.push(...result.done);
    left.push(...result.left);
  }
  const skills = installSkills(project);
  if (skills.length > 0)
    done.push(
      `Refreshed the method's skills (${String(skills.length)} folders).`,
    );
  const used = new Set(companyOf(root).kits);
  const servers = addKitServers(
    project,
    kits.filter((kit) => used.has(kit.id)),
  );
  if (servers.length > 0)
    done.push(`Added the MCP servers ${servers.join(", ")} to .mcp.json.`);
  if (pinCore(project, to))
    done.push(
      `Pinned the core in package.json at release ${to}: run npm install.`,
    );
  if (compareVersions(to, from) > 0)
    saveCompany(root, { ...companyOf(root), core: to });
  return { from, to, done, left, problems: await problemsOf(context) };
}

// What the factory's checks find after the upgrade.
async function problemsOf({
  project,
  root,
  kits,
  extensions,
}: UpgradeContext): Promise<string[]> {
  const loaded = loadFactory(root, { kits, extensions });
  const docs = await checkDocs(join(root, "context"));
  return [
    ...("problem" in loaded ? [loaded.problem] : loaded.problems),
    ...themeProblems(project),
    ...docs.map((p) => `context/${p.file}: ${p.message}`),
  ];
}
