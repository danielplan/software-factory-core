import {
  Bot,
  Laptop,
  ListOrdered,
  Plug,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { PageHead } from "@/components/layout/page-head";
import { Tile } from "@/components/layout/sidebar-links";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";

import {
  type SettingsTabName,
  shownTab,
  tabHash,
  tabsOf,
} from "./settings-tabs";

// The factory's settings, in six tabs at the side; only the chosen one
// shows, at its own address (#settings/updates). Connections: where work
// is tracked, the live app. AI models: which model each kind of work uses,
// and the builder's group. Updates. This
// computer: the start on the desktop. Advanced: the factory's own programs,
// then each settings group that no extension has (an extension's are in its
// details in the Marketplace). Each card shows what is set now and saves on its own; the
// parts that read it can be restarted from there. The sections come from
// the app (app/settings-page.tsx), which puts the features' cards together.
export function SettingsTab({
  open,
  sections,
}: Readonly<{ open: string | null; sections: SettingsSection[] }>) {
  const t = useT();
  const tabs = tabsOf(sections);
  const shown = shownTab(tabs, open);
  return (
    <div className="grid gap-5">
      <PageHead title={t.shell.pages.settings} about={t.settings.about} />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          aria-label={t.shell.pages.settings}
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

type TabWord = keyof Messages["settings"]["tabs"];

// Each tab's icon and colour, as the pages in the sidebar have, and its
// name's key in the words (the English name stays its address).
const LOOKS: Record<
  SettingsTabName,
  { icon: ReactNode; color: string; word: TabWord }
> = {
  Connections: {
    icon: <Plug aria-hidden />,
    color: "var(--source-app)",
    word: "connections",
  },
  Stages: {
    icon: <ListOrdered aria-hidden />,
    color: "var(--explore)",
    word: "stages",
  },
  "AI models": {
    icon: <Bot aria-hidden />,
    color: "var(--explore)",
    word: "models",
  },
  Updates: {
    icon: <RefreshCw aria-hidden />,
    color: "var(--build)",
    word: "updates",
  },
  "This computer": {
    icon: <Laptop aria-hidden />,
    color: "var(--understand)",
    word: "computer",
  },
  Advanced: {
    icon: <SlidersHorizontal aria-hidden />,
    color: "var(--understand)",
    word: "advanced",
  },
};

// One tab: the chosen one on white, like a card on the grey page, with the
// text and coloured icon of the chosen page in the sidebar; the others
// plain grey.
function TabLink({
  name,
  chosen,
}: Readonly<{ name: SettingsTabName; chosen: boolean }>) {
  const t = useT().settings;
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
      {t.tabs[LOOKS[name].word]}
    </a>
  );
}

// One section of the settings: its name, its tab and what it shows.
export type SettingsSection = {
  name: string;
  tab: SettingsTabName;
  body: ReactNode;
};
