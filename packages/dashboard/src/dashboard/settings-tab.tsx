import { useState } from "react";

import { onTrackers } from "@/add-ons/trackers";
import { TrackerChoice } from "@/connect/connect-page";

import type { FactoryState } from "./dashboard";
import { GroupCard, sectionId, Topic } from "./settings-card";

// The factory's settings, in order: a list of the sections at the side
// (when there is more than one), the cards using the full width: where
// work is tracked, then each settings group that no add-on has (an
// add-on's are in its card on Add-ons). Each card shows what is set now
// and saves on its own; the parts that read it can be restarted from there.
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  const groups = state.settings.filter((group) => !owned.has(group.id));
  const sections = [
    "Where work is tracked",
    ...groups.map((group) => group.name),
  ];
  return (
    <div className="grid gap-5">
      <h1 className="px-1 pt-1 text-[26px] font-semibold tracking-[-0.02em]">
        Settings
      </h1>
      <div
        className={
          sections.length > 1
            ? "grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]"
            : "grid"
        }
      >
        {sections.length > 1 && <Sections names={sections} />}
        <div className="grid gap-5">
          <TrackerCard state={state} />
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} state={state} />
          ))}
        </div>
      </div>
    </div>
  );
}

// The settings' sections, to go to one.
function Sections({ names }: Readonly<{ names: string[] }>) {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-6 grid gap-0.5 max-lg:hidden"
    >
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-card hover:text-foreground"
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
  const now =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    "The factory's board";
  return (
    <Topic
      title="Where work is tracked"
      about={`Now: ${now}. Where the ideas you agree to become work to build.`}
    >
      <TrackerChoice
        trackers={onTrackers(state.addOns)}
        current={state.company.tracker}
        onDone={setDone}
      />
      {done && <p className="text-sm font-medium text-success">{done}</p>}
    </Topic>
  );
}
