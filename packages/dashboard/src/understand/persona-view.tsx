// Understand's second level: one persona. Their profile on the left (what
// they want, what they are drawn from, what people like them said), and on
// the right the real problem being solved for them, with what it sits
// behind (Confirm while only the kobold suggested it), then their stories.

import { useState } from "react";

import { messageOf, type PersonaPage, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { Initial, Label } from "./bits";
import { StoryRow } from "./story-card";

export function PersonaView({
  page,
  tint,
}: Readonly<{ page: PersonaPage; tint: string }>) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Profile page={page} tint={tint} />
      <div className="grid gap-2.5">
        {page.realProblems.map((real) => (
          <RealProblem key={real.id} page={page} id={real.id} />
        ))}
        <Label>
          {page.stories.length === 1
            ? "1 story"
            : `${String(page.stories.length)} stories`}
        </Label>
        {page.stories.map((story) => (
          <StoryRow key={story.id} card={story} />
        ))}
      </div>
    </div>
  );
}

function Profile({
  page,
  tint,
}: Readonly<{ page: PersonaPage; tint: string }>) {
  const { persona } = page;
  return (
    <section
      aria-label="Who they are"
      className="grid gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
    >
      <Initial name={persona.name} tint={tint} big />
      <div className="grid gap-0.5">
        <span className="text-[22px] font-semibold">{persona.name}</span>
        <span className="text-sm text-muted-foreground">{persona.role}</span>
      </div>
      {persona.description && (
        <p className="text-sm leading-relaxed">{persona.description}</p>
      )}
      <Lines title="Wants to" lines={persona.wants} />
      <Lines title="Based on" lines={persona.basedOn} />
      <div className="grid gap-1.5">
        <Label>What people like {persona.name} said</Label>
        {page.said.length === 0 && (
          <span className="text-[13px] text-muted-foreground">
            Nothing yet.
          </span>
        )}
        {page.said.map((signal) => (
          <p key={signal.id} className="flex gap-2 text-[13px] leading-snug">
            <span
              className="mt-1.5 size-2 flex-none rounded-[2px] bg-primary"
              aria-hidden
            />
            <span>
              {signal.text}{" "}
              <span className="text-muted-foreground">
                ({signal.sourceName})
              </span>
            </span>
          </p>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled
        title="Coming later"
      >
        Edit persona
      </Button>
    </section>
  );
}

function Lines({ title, lines }: Readonly<{ title: string; lines: string[] }>) {
  if (lines.length === 0) return null;
  return (
    <div className="grid gap-1">
      <Label>{title}</Label>
      {lines.map((line) => (
        <span key={line} className="text-[13px]">
          {line}
        </span>
      ))}
    </div>
  );
}

// The real problem, the problems it sits behind, and who said so.
function RealProblem({
  page,
  id,
}: Readonly<{ page: PersonaPage; id: string }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const real = page.realProblems.find((r) => r.id === id);
  if (!real) return null;
  const behind = page.problems.filter((p) => p.realProblem === id);
  const confirm = async () => {
    setProblem(null);
    try {
      await post("/api/understand/confirm", { realProblem: id });
    } catch (error) {
      setProblem(messageOf(error));
    }
  };
  return (
    <section
      aria-label="The real problem"
      className="grid gap-2 rounded-2xl border-[1.5px] border-foreground bg-card px-5 py-4"
    >
      <Label>The real problem we are solving for {page.persona.name}</Label>
      <h2 className="text-[19px] leading-snug font-semibold">{real.title}</h2>
      {real.description && <p className="text-sm">{real.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Label>Behind</Label>
        {behind.map((p) => (
          <span
            key={p.id}
            className="rounded-full bg-fresh/12 px-2.5 py-1 text-xs font-medium text-fresh"
          >
            {p.title}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <span className="flex-1 text-xs text-muted-foreground">
          {real.by === "kobold"
            ? "Suggested by the kobold, because these problems point the same way"
            : `Confirmed by ${real.by}`}
        </span>
        {real.by === "kobold" && (
          <Button variant="outline" size="sm" onClick={() => void confirm()}>
            Confirm
          </Button>
        )}
      </div>
      {problem && (
        <ProblemBox title="It could not be confirmed" text={problem} />
      )}
    </section>
  );
}
