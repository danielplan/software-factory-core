// The usage log's settings, for a study of how the factory is used: off
// unless the company switches it on, for the whole team (in team.env, which
// git shares), and each computer keeps its own log in a folder of its own
// choosing, next to the project by default (never in its repository).

import { dirname, join, basename, isAbsolute } from "node:path";

import { readSettings } from "../parts/addresses.ts";
import {
  readGroup,
  saveGroup,
  type SettingGroup,
} from "../settings/setting-groups.ts";
import { PERSONAL_FILE, TEAM_FILE } from "../settings/team-file.ts";

export const USAGE_KEY = "FACTORY_USAGE_LOG";
export const USAGE_FOLDER_KEY = "FACTORY_USAGE_FOLDER";

export const usageSettings: SettingGroup = {
  id: "usage-log",
  name: "Usage log",
  about:
    "A record of how the factory is used, for a study: every change to an exploration and each prototype with its change and a picture. Switched on for the whole team; each computer keeps its own.",
  file: TEAM_FILE,
  formerly: PERSONAL_FILE,
  usedBy: [],
  fields: [
    {
      key: USAGE_KEY,
      label: "Keep a usage log",
      help: "On: every change to an exploration is written down, on each teammate's computer. Off by default.",
      kind: "choice",
      default: "off",
      choices: [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
    },
  ],
};

// Where this computer keeps its usage log: its own choice, in settings/.
export const usageFolderSettings: SettingGroup = {
  id: "usage-log-folder",
  name: "Usage log folder",
  about: "Where this computer keeps its usage log, when the log is on.",
  file: PERSONAL_FILE,
  usedBy: [],
  fields: [
    {
      key: USAGE_FOLDER_KEY,
      label: "Where it is kept",
      help: "A folder on this computer. Empty: next to the project, in <project>-usage.",
      kind: "text",
    },
  ],
};

// The usage log's folder when it is on; none when it is off.
export function usageFolder(root: string, project: string): string | null {
  if (readGroup(usageSettings, root)[USAGE_KEY] !== "on") return null;
  const asked = readSettings(root, usageFolderSettings.file)[
    USAGE_FOLDER_KEY
  ]?.trim();
  if (asked) return isAbsolute(asked) ? asked : join(project, asked);
  return join(dirname(project), `${basename(project)}-usage`);
}

export const UPDATE_KEY = "FACTORY_UPDATE_BY_ITSELF";

// Updates: whether the owner's folder takes the newest main from GitHub by
// itself, every few minutes.
export const updateSettings: SettingGroup = {
  id: "updates",
  name: "Updates",
  about:
    "Bringing the newest version from GitHub into this folder, without git, once the work is merged.",
  file: PERSONAL_FILE,
  usedBy: [],
  fields: [
    {
      key: UPDATE_KEY,
      label: "Update by itself",
      help: "On: every few minutes, the newest version is taken when nothing here can be lost. Off: Workshop says when one is ready.",
      kind: "choice",
      default: "off",
      choices: [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
    },
  ],
};

export function updatesByItself(root: string): boolean {
  return readSettings(root, updateSettings.file)[UPDATE_KEY] === "on";
}

export function chooseUpdatesByItself(root: string, on: boolean): void {
  saveGroup(updateSettings, root, { [UPDATE_KEY]: on ? "on" : "off" });
}
