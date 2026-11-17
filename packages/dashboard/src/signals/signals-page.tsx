// Signals (#signals, #signals/<signal>): what people said that nobody has
// looked at yet, as a list beside the one shown. Each is fixed, explored or
// dismissed in one click; then the next one is shown. At the top, a way to
// add what people said and to ask the kobold for a check-up.

import { Stethoscope } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { AddSource } from "@/understand/add-source";
import { useKoboldJobs, useOverview } from "@/understand/use-records";

import { SignalDetail } from "./signal-detail";
import { SignalList } from "./signal-list";
import { idFrom, type Shown, shownOf } from "./view";

export function SignalsPage({ open }: Readonly<{ open: string | null }>) {
  const { t } = useTranslation("understand");
  const { data, problem } = useOverview();
  const jobs = useKoboldJobs();
  const signals = data?.kobold.toLookAt ?? [];
  const ids = signals.map((signal) => signal.id);
  // What was shown before, kept as React keeps information from the last
  // render: so a signal handled (gone from the list) gives way to the next.
  const [before, setBefore] = useState<Shown>({ ids: [], shown: null });
  const shown = shownOf(before, ids, idFrom(open));
  if (before.shown !== shown || before.ids.join("\n") !== ids.join("\n"))
    setBefore({ ids, shown });
  const signal = signals.find((one) => one.id === shown);
  const personaName = (id: string) =>
    data?.personas.find((card) => card.persona.id === id)?.persona.name ?? id;
  return (
    <div className="grid content-start gap-4">
      <PageHead
        title={t("signals.title")}
        actions={
          <>
            <Button asChild variant="outline">
              <a href="#checks">
                <Stethoscope aria-hidden />
                {t("signals.checkup")}
              </a>
            </Button>
            <AddSource />
          </>
        }
      />
      {problem && <ProblemBox title={t("page.cantRead")} text={problem} />}
      {data && (
        <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
          <SignalList
            news={data.kobold}
            shown={shown}
            personaName={personaName}
          />
          {signal && (
            <SignalDetail
              signal={signal}
              job={jobs.find(
                (job) => job.kind === "sort" && job.about === signal.id,
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
