import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { trackersOf } from "@/add-ons/trackers";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHead } from "@/components/page-head";
import { TrackerChoice } from "@/connect/connect-page";
import { ConnectedBoard } from "@/connect/connected-board";

import { DesktopStart, UpdatesCard } from "@/updates/updates-card";

import { useT } from "@/i18n/use-t";

import { AddOnsTab } from "./add-ons-tab";
import { LanguageCard } from "./language-card";
import type { FactoryState } from "./dashboard";
import { LiveAppCard } from "./live-app-card";
import { GroupCard, sectionId, Topic } from "./settings-card";
import { FactoryPrograms } from "./system-page";

// The factory's settings, in order: a list of the sections at the side
// (when there is more than one), the cards using the full width: where
// work is tracked, the live app, updates, the add-ons and kits, the
// factory's own programs, this computer, then each settings group that no
// add-on has (an add-on's are in its card on Add-ons). Each card shows what is set now
// and saves on its own; the parts that read it can be restarted from there.
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const t = useT();
  const n = t.settings.sections;
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  // Updates has its own section, with its switch.
  const groups = state.settings.filter(
    (group) => !owned.has(group.id) && group.id !== "updates",
  );
  const programs = state.parts.some((part) => part.area === "factory");
  const sections = [
    n.language,
    n.tracker,
    n.liveApp,
    n.updates,
    n.addOns,
    ...(programs ? [n.programs] : []),
    n.computer,
    ...groups.map((group) => group.name),
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={t.shell.pages.settings} about={t.settings.about} />
      <div
        className={
          sections.length > 1
            ? "grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]"
            : "grid"
        }
      >
        {sections.length > 1 && <Sections names={sections} />}
        <div className="grid gap-5">
          <LanguageCard />
          <TrackerCard state={state} />
          <LiveAppCard />
          <Topic title={n.updates} about={t.settings.updatesAbout}>
            <UpdatesCard />
          </Topic>
          <Section name={n.addOns}>
            <AddOnsTab state={state} />
          </Section>
          {programs && (
            <Section name={n.programs}>
              <FactoryPrograms state={state} />
            </Section>
          )}
          <Topic title={n.computer} about={t.settings.computerAbout}>
            <DesktopStart />
          </Topic>
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} state={state} />
          ))}
        </div>
      </div>
    </div>
  );
}

// A section that brings its own cards, to go to from the list.
function Section({
  name,
  children,
}: Readonly<{ name: string; children: React.ReactNode }>) {
  return (
    <section
      id={sectionId(name)}
      aria-label={name}
      className="grid scroll-mt-6 gap-3"
    >
      <h2 className="px-1 text-[15px] font-semibold">{name}</h2>
      {children}
    </section>
  );
}

// The settings' sections, to go to one.
function Sections({ names }: Readonly<{ names: string[] }>) {
  return (
    <nav
      aria-label={useT().settings.sectionsLabel}
      className="sticky top-6 grid gap-0.5 max-lg:hidden"
    >
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground hover:bg-hover hover:text-foreground"
          onClick={() => {
            document
              .getElementById(sectionId(name))
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}

// Where work is tracked: the same choice and steps as right after setup,
// on the page; what was connected, once done.
function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const [done, setDone] = useState<string | null>(null);
  const t = useT().settings;
  const now =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    t.tracker.none;
  return (
    <Topic title={t.sections.tracker} about={t.tracker.about(now)}>
      <ConnectedBoard state={state} />
      {state.company.tracker === "none" ? (
        <TrackerChoice
          trackers={trackersOf(state.addOns)}
          current={state.company.tracker}
          onDone={setDone}
        />
      ) : (
        <Collapsible className="grid gap-4">
          <CollapsibleTrigger className="group flex items-center gap-1.5 justify-self-start text-[13px] font-medium">
            {t.tracker.change}
            <ChevronDown
              className="size-4 transition group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <TrackerChoice
              trackers={trackersOf(state.addOns)}
              current={state.company.tracker}
              connected={state.board}
              onDone={setDone}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
      {done && <p className="text-[13px] font-medium text-success">{done}</p>}
    </Topic>
  );
}
