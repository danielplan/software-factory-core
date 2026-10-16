// Installs what the owner approved on the setup canvas when the factory is
// made: the add-ons go in the company file, the tools are installed on this
// computer with their own commands, each as a job the page shows.

import { join } from "node:path";

import { readCompany, saveCompany } from "@software-factory/core";

import type { Job } from "./api.ts";
import type { Installable } from "./installables.ts";
import { runJobs, runSteps } from "./jobs.ts";
import { Refused } from "./refused.ts";

// True when everything approved was installed.
export async function install(
  root: string,
  chosen: Installable[],
  show: (jobs: Job[]) => void,
): Promise<boolean> {
  const addOns = chosen.filter((i) => i.kind === "add-on");
  if (addOns.length > 0) switchOn(root, addOns);
  const tools = chosen.filter((i) => i.kind === "tool");
  if (tools.length === 0) return true;
  return runJobs(
    tools.map((tool) => ({
      id: `install-${tool.id}`,
      label: `Installing ${tool.name}`,
      run: async (log) => {
        if (tool.present()) {
          log(`${tool.name} is here already.`);
          return true;
        }
        if (!tool.steps) {
          log(`The factory cannot install it on this computer. ${tool.how}`);
          return false;
        }
        return runSteps(tool.steps, root, log);
      },
    })),
    show,
  );
}

function switchOn(root: string, addOns: Installable[]): void {
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) throw new Refused(read.problem);
  const extensions = new Set([
    ...read.company.extensions,
    ...addOns.map((a) => a.id),
  ]);
  saveCompany(root, { ...read.company, extensions: [...extensions] });
}
