import { Ban, GitBranch, SquareKanban } from "lucide-react";
import { type ReactNode, useState } from "react";

import { post } from "@/api";
import { ChoiceCard } from "@/components/choice-card";
import { Button } from "@/components/ui/button";

import { GitHubSteps } from "./github-steps";
import { JiraSteps } from "./jira-steps";

type Choice = "github" | "jira";

const CHOICES: { id: Choice; icon: ReactNode; title: string; text: string }[] =
  [
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

// Connecting where work is tracked, step by step, right after setup (and
// from the board and Settings later): choose GitHub or Jira, follow its
// steps, each checked; or do it later.
export function ConnectPage() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const later = () => {
    void post("/api/connect/later").finally(() => {
      window.location.hash = "board";
    });
  };
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 pt-[8vh]">
      <header className="grid gap-2">
        <h1 className="text-[30px] font-medium tracking-[-0.02em]">
          Connect where work is tracked
        </h1>
        <p className="text-muted-foreground">
          The ideas you agree to go on your board there, and the factory works
          from it.
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
            className="grid gap-3 sm:grid-cols-2"
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
          {choice === "github" && <GitHubSteps onDone={setDone} />}
          {choice === "jira" && <JiraSteps onDone={setDone} />}
          <Button
            variant="ghost"
            className="h-10 justify-self-start px-3 text-muted-foreground"
            onClick={later}
          >
            <Ban aria-hidden /> Later
          </Button>
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
