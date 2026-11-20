// Settings' tabs (settings-tab.tsx): the sections grouped in five themes,
// one tab shown at a time, at its own address (#settings/this-computer).

export const SETTINGS_TABS = [
  "Connections",
  "Updates",
  "Add-ons",
  "This computer",
  "Advanced",
] as const;
export type SettingsTabName = (typeof SETTINGS_TABS)[number];

export type SettingsTabOf<T> = { name: SettingsTabName; sections: T[] };

// "This computer" → "this-computer".
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// "This computer" → "#settings/this-computer".
export const tabHash = (name: SettingsTabName) => `#settings/${slugOf(name)}`;

// The tabs in their order, each with its sections; a tab with none is left out.
export function tabsOf<T extends { tab: SettingsTabName }>(
  sections: T[],
): SettingsTabOf<T>[] {
  return SETTINGS_TABS.map((name) => ({
    name,
    sections: sections.filter((section) => section.tab === name),
  })).filter((tab) => tab.sections.length > 0);
}

// The tab the address opens (what follows #settings/), or the first.
export function shownTab<T>(
  tabs: SettingsTabOf<T>[],
  open: string | null,
): SettingsTabOf<T> | undefined {
  return tabs.find((tab) => slugOf(tab.name) === open) ?? tabs[0];
}
