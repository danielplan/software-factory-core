import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { FactoryState } from "@/api/client";
import { ConnectedBoard } from "@/components/connected-board";
import { Topic } from "@/components/settings-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { TrackerChoice } from "./connect-page";
import { trackersOf } from "./trackers";

// Where work is tracked: the same choice and steps as right after setup,
// on the page; what was connected, once done.
export function TrackerCard({ state }: Readonly<{ state: FactoryState }>) {
  const [done, setDone] = useState<string | null>(null);
  const t = useTranslation().t;
  const now =
    state.addOns.find((addOn) => addOn.id === state.company.tracker)?.name ??
    t("settings.tracker.none");
  return (
    <Topic
      title={t("settings.sections.tracker")}
      about={t("settings.tracker.about", { now })}
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
            {t("settings.tracker.change")}
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
