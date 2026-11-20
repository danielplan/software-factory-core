import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

import type { GroupView } from "@/api";

import { trackersOf } from "@/add-ons/trackers";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";
import { VARIANT } from "@/lib/variant";
import { useSignals } from "@/signals/use-signals";
import { updatesSummary } from "@/updates/updates-model";
import { TrackerChoice } from "@/connect/connect-page";
import { ConnectedBoard } from "@/connect/connected-board";

import { DesktopStart, UpdatesCard } from "@/updates/updates-card";

import type { UpdatesView } from "../../../server/src/updates/served.ts";

import { AddOnsTab } from "./add-ons-tab";
import type { FactoryState } from "./dashboard";
import { LiveAppCard } from "./live-app-card";
import { GroupCard, sectionId, Topic } from "./settings-card";
import { FactoryPrograms } from "./system-page";

// The factory's settings, in order: where work is tracked, the live app,
// updates, the add-ons and kits, the factory's own programs, this computer,
// then each settings group that no add-on has (an add-on's are in its card
// on Add-ons). Each card shows what is set now and saves on its own.
// Prototype: three ways to arrange them, by the page address (?variant=):
// A one section at a time, from a list of tabs, each with its own address;
// B the sections in a few themes, one theme at a time; C one page of short
// summaries, each opening to its card.
export function SettingsTab({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const sections = sectionsOf(state);
  return (
    <div className="grid gap-5">
      {VARIANT === "A" && <OneAtATime sections={sections} open={open} />}
      {VARIANT === "B" && <Themes sections={sections} open={open} />}
      {VARIANT === "C" && <Summaries sections={sections} />}
    </div>
  );
}

const ABOUT =
  "How the factory works here: where work is tracked, updates, add-ons, and the settings of its parts.";

type Theme = "Connections" | "Updates" | "Add-ons" | "This computer & advanced";
const THEMES: Theme[] = [
  "Connections",
  "Updates",
  "Add-ons",
  "This computer & advanced",
];

type SettingsSection = {
  name: string;
  theme: Theme;
  // What is set now, in a line.
  summary: ReactNode;
  body: ReactNode;
};

function sectionsOf(state: FactoryState): SettingsSection[] {
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  // Updates has its own section, with its switch.
  const groups = state.settings.filter(
    (group) => !owned.has(group.id) && group.id !== "updates",
  );
  const programs = state.parts.filter((part) => part.area === "factory");
  const tracker =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    "No board connected yet";
  const addOnsOn = state.addOns.filter((addOn) =>
    addOn.tracker ? state.company.tracker === addOn.id : addOn.on,
  );
  return [
    {
      name: "Where work is tracked",
      theme: "Connections",
      summary: tracker,
      body: <TrackerCard state={state} />,
    },
    {
      name: "The live app",
      theme: "Connections",
      summary: <LiveAppNow />,
      body: <LiveAppCard />,
    },
    {
      name: "Updates",
      theme: "Updates",
      summary: <UpdatesNow />,
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
      theme: "Add-ons",
      summary:
        addOnsOn.length > 0
          ? `Uses ${addOnsOn.map((addOn) => addOn.name).join(", ")}`
          : "Nothing extra yet",
      body: (
        <Section name="Add-ons">
          <AddOnsTab state={state} />
        </Section>
      ),
    },
    ...(programs.length > 0
      ? [
          {
            name: "The factory's programs",
            theme: "This computer & advanced" as const,
            summary: programs.map((part) => part.name).join(", "),
            body: (
              <Section name="The factory's programs">
                <FactoryPrograms state={state} />
              </Section>
            ),
          },
        ]
      : []),
    {
      name: "This computer",
      theme: "This computer & advanced",
      summary: "A start on the desktop, for owners who do not use a terminal",
      body: (
        <Topic title="This computer" about="For owners who do not use a terminal.">
          <DesktopStart />
        </Topic>
      ),
    },
    ...groups.map((group) => ({
      name: group.name,
      theme: "This computer & advanced" as const,
      summary: groupNow(group),
      body: <GroupCard group={group} state={state} />,
    })),
  ];
}

// A group's values, in a line: "Model: fast · Effort: standard".
function groupNow(group: GroupView): string {
  return group.fields
    .map((field) => {
      const value =
        field.kind === "secret"
          ? field.value
            ? "set"
            : "not set"
          : (field.choices?.find((one) => one.value === field.value)?.label ??
            field.value ??
            (field.default ? `${field.default} (standard)` : "not set"));
      return `${field.label}: ${value}`;
    })
    .join(" · ");
}

function LiveAppNow() {
  const { data } = useSignals();
  const sync = data?.sync;
  if (!sync) return null;
  return sync.connected ? `Reads from ${sync.address}` : "Not connected";
}

function UpdatesNow() {
  const { data } = useRead("/api/updates") as Read<UpdatesView>;
  if (!data) return null;
  return `${updatesSummary(data).title}${data.byItself ? " · updates by itself" : ""}`;
}

const hashOf = (name: string) =>
  `#settings/${sectionId(name).replace(/^settings-/, "")}`;

const chosen = <T extends { name: string }>(
  all: T[],
  open: string | null,
): T | undefined =>
  all.find((one) => open !== null && hashOf(one.name) === `#settings/${open}`) ??
  all[0];

// A: the side list as tabs; only the chosen section shows, at its own
// address (#settings/updates).
function OneAtATime({
  sections,
  open,
}: Readonly<{ sections: SettingsSection[]; open: string | null }>) {
  const shown = chosen(sections, open);
  return (
    <>
      <PageHead title="Settings" about={ABOUT} />
      <div className="grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Sections" className="sticky top-6 grid gap-0.5">
          {sections.map((section) => (
            <a
              key={section.name}
              href={hashOf(section.name)}
              aria-current={section === shown ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground hover:bg-hover hover:text-foreground",
                section === shown &&
                  "bg-picked font-medium text-foreground hover:bg-picked",
              )}
            >
              {section.name}
            </a>
          ))}
        </nav>
        <div className="grid gap-5">{shown?.body}</div>
      </div>
    </>
  );
}

// B: the sections in a few themes, as the page's own tabs beside its
// title; one theme at a time, at its own address (#settings/connections).
function Themes({
  sections,
  open,
}: Readonly<{ sections: SettingsSection[]; open: string | null }>) {
  const themes = THEMES.map((name) => ({
    name,
    sections: sections.filter((section) => section.theme === name),
  })).filter((theme) => theme.sections.length > 0);
  const shown = chosen(themes, open);
  return (
    <>
      <PageHead title="Settings" about={ABOUT}>
        <nav
          aria-label="Themes"
          className="inline-flex flex-wrap gap-0.5 rounded-[14px] bg-[#eceef2] p-1 text-[13px]"
        >
          {themes.map((theme) => (
            <a
              key={theme.name}
              href={hashOf(theme.name)}
              aria-current={theme === shown ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-[10px] px-3.5 font-medium text-muted-foreground",
                theme === shown &&
                  "bg-card text-foreground shadow-[0_1px_3px_rgb(20_24_36/0.1)]",
              )}
            >
              {theme.name}
              <span className="text-xs text-faint">{theme.sections.length}</span>
            </a>
          ))}
        </nav>
      </PageHead>
      <div className="grid gap-5">
        {shown?.sections.map((section) => (
          <Fragment key={section.name}>{section.body}</Fragment>
        ))}
      </div>
    </>
  );
}

// C: one page, each section a line of what is set now; open one to change
// it, Done to fold it again.
function Summaries({ sections }: Readonly<{ sections: SettingsSection[] }>) {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <>
      <PageHead title="Settings" about={ABOUT} />
      <div className="grid gap-2.5">
        {sections.map((section) =>
          opened === section.name ? (
            <div key={section.name} className="relative my-2.5">
              {section.body}
              <Button
                variant="ring"
                size="pill-sm"
                className="absolute top-5 right-5"
                onClick={() => {
                  setOpened(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <button
              key={section.name}
              type="button"
              onClick={() => {
                setOpened(section.name);
              }}
              className="flex items-center gap-4 rounded-xl border bg-card px-5 py-3.5 text-left shadow-soft hover:bg-surface"
            >
              <span className="w-48 flex-none text-[14px] font-semibold">
                {section.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                {section.summary}
              </span>
              <span className="flex items-center gap-1 text-[13px] font-medium">
                Change
                <ChevronRight aria-hidden className="size-4" />
              </span>
            </button>
          ),
        )}
      </div>
    </>
  );
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
