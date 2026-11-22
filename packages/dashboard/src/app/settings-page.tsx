// Settings, put together from the cards each area brings: where work is
// tracked (Connect), the sections of the installed extensions (the live
// app, from Signals), the stages, updates and what's new (Updates), the
// language, the start on this computer, the factory's own programs (System)
// and each settings group no extension has. The settings page
// (features/settings) shows them in its tabs.

import type { ReactNode } from "react";

import type { FactoryState } from "@/api/client";
import { GroupCard, Section, Topic } from "@/components/settings-card";
import type { SettingsSection } from "@/lib/page-module";
import { TrackerCard } from "@/features/connect/tracker-card";
import { LanguageCard } from "@/features/settings/language-card";
import { SettingsTab } from "@/features/settings/settings-tab";
import { GROUP_TABS, type SettingsTabName } from "@/lib/settings-tabs";
import { StagesCard } from "@/features/settings/stages-card";
import { FactoryPrograms } from "@/features/system/system-page";
import { DesktopStart, UpdatesCard } from "@/features/updates/updates-card";
import { WhatsNew } from "@/features/updates/whats-new";
import type { Messages } from "@/i18n/messages";
import { useT } from "@/i18n/use-t";

import { installedOf } from "./extensions";

export function SettingsPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const t = useT();
  return (
    <SettingsTab
      open={open}
      sections={[
        ...sectionsOf(state, t.settings, t.whatsNew.about),
        ...installedOf(state).flatMap((module) => module.settings?.(t) ?? []),
      ]}
    />
  );
}

function sectionsOf(
  state: FactoryState,
  t: Messages["settings"],
  whatsNewAbout: string,
): SettingsSection[] {
  const n = t.sections;
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  // Updates has its own section, with its switch.
  const groups = state.settings.filter(
    (group) => !owned.has(group.id) && group.id !== "updates",
  );
  const programs = state.parts.some((part) => part.area === "factory");
  const section = (
    name: string,
    tab: SettingsTabName,
    body: ReactNode,
  ): SettingsSection => ({ name, tab, body });
  return [
    section(n.tracker, "Connections", <TrackerCard state={state} />),
    section(n.stages, "Stages", <StagesCard state={state} />),
    section(
      n.updates,
      "Updates",
      <Topic title={n.updates} about={t.updatesAbout}>
        <UpdatesCard />
      </Topic>,
    ),
    section(
      n.whatsNew,
      "Updates",
      <Topic title={n.whatsNew} about={whatsNewAbout}>
        <WhatsNew />
      </Topic>,
    ),
    section(n.language, "This computer", <LanguageCard />),
    section(
      n.computer,
      "This computer",
      <Topic title={n.computer} about={t.computerAbout}>
        <DesktopStart />
      </Topic>,
    ),
    ...(programs
      ? [
          section(
            n.programs,
            "Advanced",
            <Section name={n.programs}>
              <FactoryPrograms state={state} />
            </Section>,
          ),
        ]
      : []),
    ...groups.map((group) =>
      section(
        group.name,
        GROUP_TABS[group.id] ?? "Advanced",
        <GroupCard group={group} state={state} />,
      ),
    ),
  ];
}
