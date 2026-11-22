// The host an extension module is served with: the core's side of the plug
// board (plugs/extension.ts), made from the session and the server.

import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";

import type { TaskBoards } from "../cards/cards-for.ts";
import { connectedCards } from "../cards/cards-for.ts";
import type { CodeHosts } from "../code-host.ts";
import type { Cli } from "../github-cli.ts";
import { appAddress, appsOf, playwrightBrowser } from "../kobble/browser.ts";
import { storeOf } from "../kobble/records.ts";
import type { ExtensionModule, Host } from "../plugs/extension.ts";
import type { PlugBoard } from "../plugs/index.ts";
import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";
import type { TestsRunOn } from "./assemble.ts";

export function hostOf(
  session: Session,
  on: {
    cli: Cli;
    changed: (what: string) => void;
    stateChanged: () => void;
    slots: { code: CodeHosts; tasks: TaskBoards };
    testsRunOn?: TestsRunOn;
  },
): (module: ExtensionModule, plug: PlugBoard) => Host {
  const { project, coach, available } = session.options;
  const factory = join(project, FACTORY_FOLDER);
  const runOn = on.testsRunOn ?? {
    apps: () => appsOf(() => session.launcherOrRefuse()),
    app: (product: string | null) =>
      appAddress(() => session.launcherOrRefuse(), product),
    browser: playwrightBrowser,
  };
  const records = () => storeOf(factory, project);
  return (module, plug) => ({
    project,
    factory,
    claude: coach.claude,
    cli: on.cli,
    store: () => {
      const found = records();
      if (!found)
        throw new Refused("There is no factory yet: its records come with it.");
      return found;
    },
    records,
    changed: on.changed,
    stateChanged: on.stateChanged,
    isOn: (id) => session.isOn(id),
    plug,
    slots: on.slots,
    cards: () => connectedCards(factory, on.slots.tasks),
    apps: runOn.apps,
    app: runOn.app,
    browser: runOn.browser,
    ...(coach.builderBrowser ? { builderBrowser: coach.builderBrowser } : {}),
    available,
    watch: (watcher) => session.plugged.watch(watcher),
    connect: (entry, secrets) => {
      session.chooseBoard(module.extension.id, entry, secrets);
    },
    installTool: (tool) => session.installTool(tool),
  });
}
