import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { trackersOf } from "@/add-ons/trackers";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHead } from "@/components/page-head";
import { TrackerChoice } from "@/connect/connect-page";
import { ConnectedBoard } from "@/connect/connected-board";

import { AddOnsTab } from "./add-ons-tab";
import type { FactoryState } from "./dashboard";
import { LanguageCard } from "./language-card";
import { LookCard } from "./look-card";
import { GroupCard, Topic } from "./settings-card";

// The factory's settings, one card under another: where work is tracked,
// the language, light or dark, then each settings group that no add-on has
// (an add-on's are in its card below). Each card shows what is set now and
// saves on its own; the parts that read it can be restarted from there.
// Under them, the add-ons and kits the factory works with (#workshop and
// #add-ons lead here).
export function SettingsTab({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("settings");
  const owned = new Set(state.addOns.flatMap((addOn) => addOn.settings));
  const groups = state.settings.filter((group) => !owned.has(group.id));
  return (
    <div className="grid content-start gap-8">
      <div className="grid max-w-3xl gap-4">
        <PageHead title={t("page.title")} />
        <TrackerCard state={state} />
        <LanguageCard />
        <LookCard />
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} state={state} />
        ))}
      </div>
      <section
        aria-labelledby="add-ons-and-kits"
        className="grid content-start gap-4 pt-4"
      >
        <h2 id="add-ons-and-kits" className="text-section">
          {t("workshop.title")}
        </h2>
        <AddOnsTab state={state} />
      </section>
    </div>
  );
}

// Where work is tracked: what it is now, and the same choice and steps as
// right after setup, folded away until asked for.
function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("settings");
  const [done, setDone] = useState<string | null>(null);
  const now =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    t("tracker.own");
  return (
    <Topic title={t("tracker.title")} about={t("tracker.now", { name: now })}>
      <ConnectedBoard state={state} />
      <Collapsible className="grid gap-4">
        <CollapsibleTrigger className="group flex items-center gap-1.5 justify-self-start text-body font-medium">
          {t("tracker.change")}
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
      {done && <p className="text-body font-medium text-success">{done}</p>}
    </Topic>
  );
}
