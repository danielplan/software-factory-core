import {
  ChevronDown,
  Laptop,
  Plug,
  Puzzle,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

import { trackersOf } from "@/add-ons/trackers";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHead } from "@/components/page-head";
import { Tile } from "@/components/sidebar-links";
import { TrackerChoice } from "@/connect/connect-page";
import { ConnectedBoard } from "@/connect/connected-board";
import { cn } from "@/lib/utils";

import { DesktopStart, UpdatesCard } from "@/updates/updates-card";

import { AddOnsTab } from "./add-ons-tab";
import type { FactoryState } from "./dashboard";
import { LiveAppCard } from "./live-app-card";
import { GroupCard, sectionId, Topic } from "./settings-card";
import {
  type SettingsTabName,
  shownTab,
  tabHash,
  tabsOf,
} from "./settings-tabs";
import { FactoryPrograms } from "./system-page";

// The factory's settings, in five tabs at the side; only the chosen one
// shows, at its own address (#settings/updates). Connections: where work
// is tracked, the live app. Updates. Add-ons: the add-ons and kits. This
// computer: the start on the desktop. Advanced: the factory's own programs,
// then each settings group that no add-on has (an add-on's are in its card
// on Add-ons). Each card shows what is set now and saves on its own; the
// parts that read it can be restarted from there.
export function SettingsTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const tabs = tabsOf(sectionsOf(state));
  const shown = shownTab(tabs, open);
  return (
    <div className="grid gap-5">
      <PageHead
        title="Settings"
        about="How the factory works here: where work is tracked, updates, add-ons, and the settings of its parts."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings"
          className="flex flex-wrap gap-1 lg:sticky lg:top-6 lg:grid"
        >
          {tabs.map((tab) => (
            <TabLink key={tab.name} name={tab.name} chosen={tab === shown} />
          ))}
        </nav>
        <div className="grid gap-5">
          {shown?.sections.map((section) => (
            <Fragment key={section.name}>{section.body}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// Each tab's icon and colour, as the pages in the sidebar have.
const LOOKS: Record<SettingsTabName, { icon: ReactNode; color: string }> = {
  Connections: { icon: <Plug aria-hidden />, color: "var(--source-app)" },
  Updates: { icon: <RefreshCw aria-hidden />, color: "var(--build)" },
  "Add-ons": { icon: <Puzzle aria-hidden />, color: "var(--explore)" },
  "This computer": { icon: <Laptop aria-hidden />, color: "var(--understand)" },
  Advanced: {
    icon: <SlidersHorizontal aria-hidden />,
    color: "var(--understand)",
  },
};

// One tab: the chosen one on white, like a card on the grey page, with the
// text and coloured icon of the chosen page in the sidebar; the others
// plain grey.
function TabLink({
  name,
  chosen,
}: Readonly<{ name: SettingsTabName; chosen: boolean }>) {
  return (
    <a
      href={tabHash(name)}
      aria-current={chosen ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] font-normal text-sidebar-muted hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
        chosen &&
          "bg-card text-sidebar-active-foreground shadow-[0_1px_3px_rgb(20_24_36/0.1)] hover:text-sidebar-active-foreground",
      )}
    >
      <Tile color={chosen ? LOOKS[name].color : "var(--sidebar-muted)"}>
        {LOOKS[name].icon}
      </Tile>
      {name}
    </a>
  );
}

type SettingsSection = { name: string; tab: SettingsTabName; body: ReactNode };

function sectionsOf(state: FactoryState): SettingsSection[] {
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  // Updates has its own section, with its switch.
  const groups = state.settings.filter(
    (group) => !owned.has(group.id) && group.id !== "updates",
  );
  const programs = state.parts.some((part) => part.area === "factory");
  return [
    {
      name: "Where work is tracked",
      tab: "Connections",
      body: <TrackerCard state={state} />,
    },
    { name: "The live app", tab: "Connections", body: <LiveAppCard /> },
    {
      name: "Updates",
      tab: "Updates",
      body: (
        <Topic
          title="Updates"
          about="Merged work comes to this computer from GitHub; new versions of Kobble come as a card for the builder."
        >
          <UpdatesCard />
        </Topic>
      ),
    },
    {
      name: "Add-ons",
      tab: "Add-ons",
      body: (
        <Section name="Add-ons">
          <AddOnsTab state={state} />
        </Section>
      ),
    },
    {
      name: "This computer",
      tab: "This computer",
      body: (
        <Topic
          title="This computer"
          about="For owners who do not use a terminal."
        >
          <DesktopStart />
        </Topic>
      ),
    },
    ...(programs
      ? [
          {
            name: "The factory's programs",
            tab: "Advanced" as const,
            body: (
              <Section name="The factory's programs">
                <FactoryPrograms state={state} />
              </Section>
            ),
          },
        ]
      : []),
    ...groups.map((group) => ({
      name: group.name,
      tab: "Advanced" as const,
      body: <GroupCard group={group} state={state} />,
    })),
  ];
}

// A section that brings its own cards.
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

// Where work is tracked: the same choice and steps as right after setup,
// on the page; what was connected, once done.
function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const [done, setDone] = useState<string | null>(null);
  const now =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    "No board connected yet";
  return (
    <Topic
      title="Where work is tracked"
      about={`Now: ${now}. Where the ideas you agree to become work to build.`}
    >
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
            Change where work is tracked
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
