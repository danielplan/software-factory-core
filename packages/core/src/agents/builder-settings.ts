// The builder's own settings, in the factory's Settings tab: how many cards
// each lane works on at once, and the model the builder uses (empty: the
// factory's Claude model). Read again for each job, so a change counts from
// the next one. The same for the whole team, so they are kept in the
// factory's team.env, which git shares (team-file.ts).

import { readGroup, type SettingGroup } from "../settings/setting-groups.ts";
import { PERSONAL_FILE, TEAM_FILE } from "../settings/team-file.ts";

export const PARALLEL_KEY = "FACTORY_PARALLEL_CARDS";
export const BUILDER_MODEL_KEY = "FACTORY_BUILDER_MODEL";
const MOST_CARDS = 5;

export const builderSettings: SettingGroup = {
  id: "builder",
  name: "Builder",
  about: "How the factory works through the board's cards.",
  file: TEAM_FILE,
  formerly: PERSONAL_FILE,
  usedBy: [],
  fields: [
    {
      key: PARALLEL_KEY,
      label: "Cards at once",
      help: "How many cards the coach and the builder each work on at the same time, each in a working copy of its own.",
      kind: "number",
      default: "1",
      min: 1,
      max: MOST_CARDS,
    },
    {
      key: BUILDER_MODEL_KEY,
      label: "Builder's model",
      help: "A name such as sonnet or opus for building and fixing cards. Empty means the factory's Claude model.",
      kind: "text",
      pattern: "^[\\w.\\[\\]-]+$",
    },
  ],
};

// Cards at once, from 1 to 5; 1 when the file says nothing usable.
export function parallelCards(root: string | null): number {
  if (!root) return 1;
  const value = Number(readGroup(builderSettings, root)[PARALLEL_KEY]);
  return Number.isInteger(value) && value >= 1
    ? Math.min(value, MOST_CARDS)
    : 1;
}

// The builder's model; none means the factory's own choice.
export function builderModel(root: string | null): string | undefined {
  if (!root) return undefined;
  const value = readGroup(builderSettings, root)[BUILDER_MODEL_KEY];
  return value?.trim() || undefined;
}
