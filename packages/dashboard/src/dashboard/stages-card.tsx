// Settings › Stages: the order work goes through, from what the extensions
// suggest and what the team moved. When two stages both fit one place, the
// team is asked which comes first.

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

import { post, type StagesView } from "@/api";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { nameOf } from "@/lib/market-view";
import { moveStage, settle, stageName } from "@/lib/stages-view";

import type { FactoryState } from "./dashboard";
import { Topic } from "./settings-card";

type Place = StagesView["order"][number];

export function StagesCard({ state }: Readonly<{ state: FactoryState }>) {
  const t = useT();
  const w = t.settings.stages;
  const { order, clash } = state.stages;
  const [problem, setProblem] = useState(false);
  const ids = order.map((place) => place.id);
  const named = (place: Place) => stageName(t.market.stages, place);
  const keep = (next: string[]) => {
    setProblem(false);
    post("/api/stages", { order: next }).catch(() => {
      setProblem(true);
    });
  };
  const first = order.find((place) => place.id === clash?.first);
  const second = order.find((place) => place.id === clash?.second);
  return (
    <Topic title={t.settings.sections.stages} about={w.about}>
      {first && second && (
        <Clash
          question={w.clash(named(first), named(second))}
          answers={[
            {
              label: w.first(named(first)),
              ids: settle(ids, first.id, second.id),
            },
            {
              label: w.first(named(second)),
              ids: settle(ids, second.id, first.id),
            },
          ]}
          onAnswer={keep}
        />
      )}
      {order.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{w.none}</p>
      ) : (
        <ol className="grid gap-1.5">
          {order.map((place, at) => (
            <StageRow
              key={place.id}
              place={place}
              at={at}
              last={at === order.length - 1}
              state={state}
              onMove={(by) => {
                keep(moveStage(ids, place.id, by));
              }}
            />
          ))}
        </ol>
      )}
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {w.notKept}
        </p>
      )}
    </Topic>
  );
}

// Two stages for one place: which comes first? Each answer is the whole
// order that follows from it.
function Clash({
  question,
  answers,
  onAnswer,
}: Readonly<{
  question: string;
  answers: { label: string; ids: string[] }[];
  onAnswer: (ids: string[]) => void;
}>) {
  return (
    <div
      role="group"
      aria-label={question}
      className="grid gap-2.5 rounded-xl border border-border bg-surface p-3.5"
    >
      <p className="text-[13px] font-medium">{question}</p>
      <div className="flex flex-wrap gap-2">
        {answers.map((answer) => (
          <Button
            key={answer.label}
            variant="ring"
            size="pill"
            onClick={() => {
              onAnswer(answer.ids);
            }}
          >
            {answer.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function StageRow({
  place,
  at,
  last,
  state,
  onMove,
}: Readonly<{
  place: Place;
  at: number;
  last: boolean;
  state: FactoryState;
  onMove: (by: -1 | 1) => void;
}>) {
  const t = useT();
  const w = t.settings.stages;
  const name = stageName(t.market.stages, place);
  const owner = state.addOns.find((one) => one.id === place.by);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <span className="w-5 text-xs text-muted-foreground tabular-nums">
        {at + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {w.by(owner ? nameOf(t.market, owner) : place.by)}
        </span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${w.moveUp}: ${name}`}
        disabled={at === 0}
        onClick={() => {
          onMove(-1);
        }}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${w.moveDown}: ${name}`}
        disabled={last}
        onClick={() => {
          onMove(1);
        }}
      >
        <ArrowDown aria-hidden />
      </Button>
    </li>
  );
}
