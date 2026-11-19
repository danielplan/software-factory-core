// The last step, as in the design: what Kobble writes into the repository,
// as a list that ticks off once it is done; Set up Kobble to start it (the
// kobold says when something is still open, but the owner decides), then
// Open Kobble.

import { Check } from "lucide-react";

import type { State } from "@/api";

import { isApp, isPerson } from "./card-bits";
import { cardsIn, setUpDone } from "./steps";

type SetupState = Extract<State, { mode: "setup" }>;
type Coach = SetupState["coach"];

export function SetupStep({
  state,
  says,
  eyebrow,
}: Readonly<{
  state: SetupState;
  says: React.ReactNode;
  eyebrow: React.ReactNode;
}>) {
  const { coach } = state;
  const words = wordsOf(coach);
  return (
    <>
      <header className="grid gap-1.5">
        {eyebrow}
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
          {words.title}
        </h1>
        <p className="text-muted-foreground">{words.lead}</p>
      </header>
      {says}
      <ul className="grid rounded-xl bg-card shadow-card">
        {plan(coach).map((line) => (
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
      {coach.phase === "build" && !setUpDone(coach) && coach.activity && (
        <p className="text-[13px] text-muted-foreground">
          Now: {coach.activity}
        </p>
      )}
    </>
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
function plan(coach: Coach): string[] {
  const { draft } = coach;
  const count = (area: string) =>
    cardsIn(draft, area).filter((c) => c.tone !== "question");
  const apps = count("Your product").filter(isApp).length;
  const people = count("Who it's for").length;
  const board = count("Team and board").some((c) => !isPerson(c));
  const bring = count("Bring over").length > 0;
  const start = count("Where to start").length;
  return [
    "Writing the factory folder, its settings and the rules each app keeps",
    `Describing ${String(apps)} apps and their checks`,
    `Adding ${String(people)} people as personas`,
    ...(board ? ["Connecting the board"] : []),
    ...(bring
      ? [
          "Bringing over what you have: the knowledge base into docs/, Kobble’s skills",
        ]
      : []),
    `Starting ${String(start)} explorations`,
  ];
}

function wordsOf(coach: Coach): { title: string; lead: string } {
  if (setUpDone(coach))
    return {
      title: "Kobble is set up",
      lead: "Everything is in place. One last step: pick where to start.",
    };
  if (coach.phase === "build")
    return {
      title: "Setting up Kobble",
      lead: "The kobold writes everything we went through into your repository. This takes a few minutes.",
    };
  return {
    title: "Set up",
    lead: "Kobble writes all of this into your repository, in a branch you can look at before you share it.",
  };
}
