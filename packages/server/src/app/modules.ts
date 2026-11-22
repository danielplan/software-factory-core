// The extensions Kobble ships with, as modules (one folder each under
// extensions/): Kobble's own, installed in every factory unless the company
// removes one (Factory is always needed, as it builds everything), and the
// add-ons that connect a service (where work is tracked). Their names and
// lines are words, kept in the page's catalogue by id.

import type { Extension } from "@software-factory/core";

import type { Fetcher } from "../extensions/jira/jira.ts";
import * as explorations from "../extensions/explorations/index.ts";
import * as factory from "../extensions/factory/index.ts";
import { githubAddOn } from "../extensions/github/index.ts";
import { jiraAddOn } from "../extensions/jira/index.ts";
import * as personas from "../extensions/personas/index.ts";
import * as releases from "../extensions/releases/index.ts";
import * as signals from "../extensions/signals/index.ts";
import type { Cli } from "../github-cli.ts";
import type { ExtensionModule } from "../plugs/extension.ts";

export const KOBBLE_MODULES: ExtensionModule[] = [
  factory,
  explorations,
  signals,
  personas,
  releases,
];

export const KOBBLE_EXTENSIONS: Extension[] = KOBBLE_MODULES.map(
  (module) => module.extension,
);

// The add-ons that ship with the factory, through this GitHub CLI and this
// way of reaching Jira (stand-ins in the tests).
export function addOnModules(cli?: Cli, fetcher?: Fetcher): ExtensionModule[] {
  return [githubAddOn(cli), jiraAddOn(fetcher)];
}
