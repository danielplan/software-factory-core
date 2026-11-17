// The conversation, as in any chat: the kobold's messages at the left with
// its picture, yours at the right; three moving dots while it thinks or
// writes; the people to choose from when it asks who an idea is for; and
// the idea it wrote, as a card that opens it.

import { Lightbulb } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { PersonaTag } from "@/api";
import { Button } from "@/components/ui/button";
import type { Said, Sent } from "@/lib/chat-view";
import { exploreHash } from "@/lib/routes";
import { Initial } from "@/understand/bits";
import { useKoboldJobs } from "@/understand/use-records";
import { tintOf } from "@/understand/view";

import { Bubble, Mine, Typing } from "./bubbles";

export type OnChoose = (
  id: number,
  idea: string,
  files: Sent[],
  person: PersonaTag,
) => void;

export function Messages({
  said,
  people,
  titleOf,
  onChoose,
}: Readonly<{
  said: Said[];
  people: PersonaTag[];
  // An idea's title, by its id, once Explore lists it.
  titleOf: (idea: string) => string | null;
  onChoose: OnChoose;
}>) {
  const { t } = useTranslation("chat");
  const end = useRef<HTMLDivElement>(null);
  const last = said.at(-1);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [said.length, last]);
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={t("conversation")}
      className="mx-auto grid w-full max-w-3xl content-start gap-5 pb-4"
    >
      {said.map((one) => (
        <Message
          key={one.id}
          one={one}
          people={people}
          titleOf={titleOf}
          onChoose={onChoose}
        />
      ))}
      <div ref={end} />
    </div>
  );
}

function Message({
  one,
  people,
  titleOf,
  onChoose,
}: Readonly<{
  one: Said;
  people: PersonaTag[];
  titleOf: (idea: string) => string | null;
  onChoose: OnChoose;
}>) {
  const { t } = useTranslation("chat");
  if (one.by === "me")
    return (
      <Mine files={one.files} steer={one.steer}>
        {one.text}
      </Mine>
    );
  if ("text" in one) return <Bubble>{one.text}</Bubble>;
  if ("thinking" in one)
    return (
      <Bubble>
        <Typing label={t("thinking")} />
      </Bubble>
    );
  if ("job" in one) return <Writing job={one.job} titleOf={titleOf} />;
  return (
    <Bubble>
      <span className="grid gap-3">
        {people.length === 0 ? t("noPeople") : t("whoFor")}
        {one.chosen === null && people.length > 0 && (
          <span className="flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onChoose(one.id, one.choose, one.files, person);
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-page py-1 pr-3.5 pl-1 text-body font-medium transition-colors outline-none hover:border-primary hover:bg-tint focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Initial name={person.name} tint={tintOf(person.at)} />
                {person.name}
              </button>
            ))}
          </span>
        )}
      </span>
    </Bubble>
  );
}

// The idea being written up: dots with what the kobold is doing; then the
// idea as a card that opens it.
function Writing({
  job: id,
  titleOf,
}: Readonly<{ job: string; titleOf: (idea: string) => string | null }>) {
  const { t } = useTranslation("chat");
  const job = useKoboldJobs().find((one) => one.id === id);
  if (job?.made)
    return (
      <Bubble>
        <span className="grid gap-3">
          {t("done")}
          <span className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-page p-3">
            <span className="grid size-9 flex-none place-items-center rounded-lg bg-solving text-solving-foreground">
              <Lightbulb aria-hidden className="size-4" />
            </span>
            <span className="grid min-w-0 flex-1">
              <b className="truncate text-item">
                {titleOf(job.made) ?? t("yourIdea")}
              </b>
              <span className="text-tag text-muted-foreground">
                {t("newOnExplore")}
              </span>
            </span>
            <Button asChild size="sm">
              <a href={exploreHash(job.made)}>{t("openIdea")}</a>
            </Button>
          </span>
        </span>
      </Bubble>
    );
  if (job?.problem)
    return <Bubble>{t("couldNotWrite", { why: job.problem })}</Bubble>;
  return (
    <Bubble>
      <Typing label={job?.activity ?? t("writing")} />
    </Bubble>
  );
}
