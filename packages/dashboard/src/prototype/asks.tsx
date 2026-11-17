// The small chat in prototype mode's side panel, in the Chat page's style:
// the kobold's greeting, then each thing asked (the person's bubble at the
// right) and the kobold's reply at the left with its picture, which follows
// the version being made (three moving dots, what it is doing) until it is
// ready to see, or says what went wrong.

import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { runOf } from "@/explore/view";
import { prototypeHash } from "@/lib/routes";
import { KoboldMark } from "@/understand/bits";

// One thing asked: the version it became once the kobold took it, or why
// it could not.
export type Asked = {
  id: number;
  text: string;
  key: string | null;
  problem: string | null;
};

export function Asks({
  idea,
  asks,
  runs,
}: Readonly<{ idea: string; asks: Asked[]; runs: VersionRun[] }>) {
  const { t } = useTranslation("explore");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [asks]);
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={t("side.chat")}
      className="grid content-start gap-3 overflow-y-auto p-3"
    >
      <Kobold>{t("side.greeting")}</Kobold>
      {asks.map((one) => (
        <div key={one.id} className="grid animate-enter gap-3">
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-body whitespace-pre-wrap text-primary-foreground">
            {one.text}
          </p>
          <Reply idea={idea} one={one} runs={runs} />
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

function Reply({
  idea,
  one,
  runs,
}: Readonly<{ idea: string; one: Asked; runs: VersionRun[] }>) {
  const { t } = useTranslation("explore");
  if (one.problem)
    return <Kobold>{t("side.couldNot", { why: one.problem })}</Kobold>;
  if (!one.key)
    return (
      <Kobold>
        <Dots />
      </Kobold>
    );
  const run = runOf(runs, idea, one.key);
  if (run.state === "making")
    return (
      <Kobold>
        <span className="grid gap-1">
          <span>{t("side.making", { version: one.key })}</span>
          {run.activity && (
            <span className="text-tag text-muted-foreground">
              {run.activity}
            </span>
          )}
          <Dots />
        </span>
      </Kobold>
    );
  if (run.state === "failed" && run.problem)
    return <Kobold>{t("side.couldNot", { why: run.problem })}</Kobold>;
  return (
    <Kobold>
      <span className="grid gap-2">
        {t("side.ready", { version: one.key })}
        <Button asChild size="sm" className="w-fit">
          <a href={prototypeHash(idea, one.key)}>{t("side.show")}</a>
        </Button>
      </span>
    </Kobold>
  );
}

function Kobold({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex max-w-[92%] items-end gap-2">
      <span className="grid size-7 flex-none place-items-center rounded-full bg-tint">
        <KoboldMark className="size-5" />
      </span>
      <div className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-body">
        {children}
      </div>
    </div>
  );
}

// Three dots that move while the kobold works (still with reduced motion).
function Dots() {
  const { t } = useTranslation("explore");
  return (
    <span
      role="status"
      aria-label={t("side.working")}
      className="flex gap-1 py-1"
    >
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="size-1.5 animate-think rounded-full bg-muted-foreground"
          style={{ animationDelay: `${String(delay)}s` }}
        />
      ))}
    </span>
  );
}
