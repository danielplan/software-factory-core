import { GitBranch, LayoutGrid, SquareKanban } from "lucide-react";
import { type ReactNode, useState } from "react";

import { post } from "@/api";
import { ChoiceCard } from "@/components/choice-card";
import { Button } from "@/components/ui/button";

import { GitHubSteps } from "./github-steps";
import { JiraSteps } from "./jira-steps";

type Choice = "factory" | "github" | "jira";

const CHOICES: { id: Choice; icon: ReactNode; title: string; text: string }[] =
  [
    {
      id: "factory",
      icon: <LayoutGrid aria-hidden />,
      title: "The factory's own board",
      text: "Work stays here, on the board in this app. Nothing to connect.",
    },
    {
      id: "github",
      icon: <GitBranch aria-hidden />,
      title: "GitHub board",
      text: "Through the GitHub CLI on this computer.",
    },
    {
      id: "jira",
      icon: <SquareKanban aria-hidden />,
      title: "Jira Cloud",
      text: "With an API token from your Jira account.",
    },
  ];

// Where work is tracked, right after setup (and from Settings later): the
// factory's own board, or a GitHub board or Jira connected step by step,
// each step checked.
export function ConnectPage() {
  const [choice, setChoice] = useState<Choice>("factory");
  const [done, setDone] = useState<string | null>(null);
  const ownBoard = () => {
    void post("/api/connect/later").finally(() => {
      window.location.hash = "board";
    });
  };
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 pt-[8vh]">
      <header className="grid gap-2">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Where should the factory keep its work?
        </h1>
        <p className="text-muted-foreground">
          The ideas you agree to become work on a board, and the factory builds
          from there. Keep it here, or use the board your team already has.
        </p>
      </header>
      {done ? (
        <section className="grid gap-4 rounded-3xl bg-card p-6 shadow-soft">
          <p className="text-[15px] font-medium text-success">{done}</p>
          <Button
            className="h-10 justify-self-start px-4"
            onClick={() => {
              window.location.hash = "board";
            }}
          >
            Go to the board
          </Button>
        </section>
      ) : (
        <>
          <div
            className="grid gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Tracker"
          >
            {CHOICES.map((one) => (
              <ChoiceCard
                key={one.id}
                chosen={choice === one.id}
                icon={one.icon}
                title={one.title}
                text={one.text}
                onChoose={() => {
                  setChoice(one.id);
                }}
              />
            ))}
          </div>
          {choice === "factory" && (
            <Button className="h-10 justify-self-start px-4" onClick={ownBoard}>
              Use the factory's board
            </Button>
          )}
          {choice === "github" && <GitHubSteps onDone={setDone} />}
          {choice === "jira" && <JiraSteps onDone={setDone} />}
        </>
      )}
    </div>
  );
}

// One step: its number, title and what it says now, and what to do.
export function Step({
  n,
  title,
  done,
  children,
}: Readonly<{ n: number; title: string; done: boolean; children: ReactNode }>) {
  return (
    <li className="flex gap-3">
      <span
        className={
          done
            ? "flex size-7 flex-none items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success"
            : "flex size-7 flex-none items-center justify-center rounded-full bg-surface-2 text-xs font-semibold"
        }
      >
        {done ? "✓" : String(n)}
      </span>
      <div className="grid min-w-0 flex-1 gap-2 pt-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        {children}
      </div>
    </li>
  );
}
