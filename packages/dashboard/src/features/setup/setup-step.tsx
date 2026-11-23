// Setting up: what Kobble writes into the repository, as a list that ticks
// off once it is done; Set up Kobble to start it (Sprocket says when
// something is still open, but the owner decides), then Open Kobble. The
// step's title and line say how far it is (headOf).

import type { TFunction } from "i18next";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CoachView } from "@/api/client";

import { isApp, isPerson } from "./card-bits";
import { cardsIn, setUpDone } from "./steps";

type Coach = CoachView;

export function SetupStep({ coach }: Readonly<{ coach: Coach }>) {
  const t = useTranslation().t;
  return (
    <ul className="grid rounded-xl bg-card shadow-card">
      {plan(coach, t).map((line) => (
        <li
          key={line}
          className="flex items-center gap-3 border-t border-border-soft px-[18px] py-3 first:border-t-0"
        >
          <Mark coach={coach} />
          <span className={setUpDone(coach) ? "" : "text-foreground-2"}>
            {line}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Mark({ coach }: Readonly<{ coach: Coach }>) {
  if (setUpDone(coach))
    return (
      <Check
        className="size-[18px] flex-none rounded-full bg-[#12a594] p-0.5 text-white"
        aria-hidden
      />
    );
  if (coach.phase === "build")
    return (
      <span className="size-[18px] flex-none animate-spin rounded-full border-2 border-border border-t-primary" />
    );
  return (
    <span className="size-[18px] flex-none rounded-full shadow-[inset_0_0_0_1.5px_var(--border)]" />
  );
}

// What setting up writes, from what the owner went through.
function plan(coach: Coach, m: TFunction): string[] {
  const { draft } = coach;
  const count = (area: string) =>
    cardsIn(draft, area).filter((c) => c.tone !== "question");
  const apps = count("Your product").filter(isApp).length;
  const people = count("Who it's for").length;
  const board = count("Team and board").some((c) => !isPerson(c));
  const bring = count("Bring over").length > 0;
  const start = count("Where to start").length;
  return [
    m("setup.plan.folder"),
    m("setup.plan.apps", { n: apps }),
    m("setup.plan.people", { n: people }),
    ...(board ? [m("setup.plan.board")] : []),
    ...(bring ? [m("setup.plan.bring")] : []),
    m("setup.plan.start", { n: start }),
  ];
}

export function setupWords(
  coach: Coach,
  m: TFunction,
): { title: string; lead: string } {
  if (setUpDone(coach)) return m("setup.done", { returnObjects: true });
  if (coach.phase === "build")
    return m("setup.building", { returnObjects: true });
  return m("setup.before", { returnObjects: true });
}
