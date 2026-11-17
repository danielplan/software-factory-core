import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackersOf } from "@/add-ons/trackers";
import { PageHead } from "@/components/page-head";
import { TrackerChoice } from "@/connect/connect-page";
import { ConnectedBoard } from "@/connect/connected-board";

import { AddOnsTab } from "./add-ons-tab";
import type { FactoryState } from "./dashboard";
import { LanguageCard } from "./language-card";
import { LookCard } from "./look-card";
import { GroupCard, Topic } from "./settings-card";

// The factory's settings, in three sections across the page: General (the
// language, light or dark), Work (where work is tracked, then each settings
// group that no add-on has; an add-on's are in its card below), and the
// add-ons and kits the factory works with (#workshop and #add-ons lead
// here). Each card shows what is set now and saves on its own; the parts
// that read it can be restarted from there.
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("settings");
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  const groups = state.settings.filter((group) => !owned.has(group.id));
  return (
    <div className="grid content-start gap-10">
      <PageHead title={t("page.title")} />
      <Section id="settings-general" title={t("sections.general")}>
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <LanguageCard />
          <LookCard />
        </div>
      </Section>
      <Section id="settings-work" title={t("sections.work")}>
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <TrackerCard state={state} />
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} state={state} />
          ))}
        </div>
      </Section>
      <Section id="add-ons-and-kits" title={t("workshop.title")}>
        <AddOnsTab state={state} />
      </Section>
    </div>
  );
}

// One part of the page, under its heading, with a hairline above it.
function Section({
  id,
  title,
  children,
}: Readonly<{ id: string; title: string; children: ReactNode }>) {
  return (
    <section
      aria-labelledby={id}
      className="grid content-start gap-4 border-t border-border-soft pt-6"
    >
      <h2 id={id} className="text-section">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Where work is tracked: what it is now, and the same choice and steps as
// right after setup, folded away until asked for.
function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("settings");
  const [done, setDone] = useState<string | null>(null);
  // Always open: the chosen one is ticked, so no line says which.
  return (
    <Topic title={t("tracker.title")}>
      <ConnectedBoard state={state} />
      <TrackerChoice
        trackers={trackersOf(state.addOns)}
        current={state.company.tracker}
        connected={state.board}
        onDone={setDone}
        settled
      />
      {done && <p className="text-body font-medium text-success">{done}</p>}
    </Topic>
  );
}
