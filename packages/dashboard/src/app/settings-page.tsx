// Settings, put together from the cards each area brings: where work is
// tracked (Connect), the sections of the installed extensions (the live
// app, from Signals), the stages, updates and what's new (Updates), the
// language, the start on this computer, the factory's own programs (System)
// and each settings group no extension has. The settings page
// (features/settings) shows them in its tabs.

import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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

import { installedOf } from "./extensions";

export function SettingsPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const t = useTranslation().t;
  return (
    <SettingsTab
      open={open}
      sections={[
        ...sectionsOf(state, t, t("whatsNew.about")),
        ...installedOf(state).flatMap((module) => module.settings?.(t) ?? []),
      ]}
    />
  );
}

function sectionsOf(
  state: FactoryState,
  t: TFunction,
  whatsNewAbout: string,
): SettingsSection[] {
  const n = t;
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
    section(
      n("settings.sections.tracker"),
      "Connections",
      <TrackerCard state={state} />,
    ),
    section(
      n("settings.sections.stages"),
      "Stages",
      <StagesCard state={state} />,
    ),
    section(
      n("settings.sections.updates"),
      "Updates",
      <Topic
        title={n("settings.sections.updates")}
        about={t("settings.updatesAbout")}
      >
        <UpdatesCard />
      </Topic>,
    ),
    section(
      n("settings.sections.whatsNew"),
      "Updates",
      <Topic title={n("settings.sections.whatsNew")} about={whatsNewAbout}>
        <WhatsNew />
      </Topic>,
    ),
    section(n("settings.sections.language"), "This computer", <LanguageCard />),
    section(
      n("settings.sections.computer"),
      "This computer",
      <Topic
        title={n("settings.sections.computer")}
        about={t("settings.computerAbout")}
      >
        <DesktopStart />
      </Topic>,
    ),
    ...(programs
      ? [
          section(
            n("settings.sections.programs"),
            "Advanced",
            <Section name={n("settings.sections.programs")}>
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
