// A mission while it runs, so it is plain that something is happening: the
// persona's kobold at work, how long it has been going, the three parts of
// a mission (getting the app ready, the persona using it, writing down what
// they found) with the one it is in moving, and the steps the persona has
// said so far, the newest one live.

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Face, PersonaTest } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { elapsed, type Phase, PHASES, phaseOf } from "@/lib/mission-live";

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

// The steps the persona has said while this page was open, in order.
function useTrail(doing: string | null | undefined): string[] {
  const [trail, setTrail] = useState<string[]>(doing ? [doing] : []);
  if (doing && trail.at(-1) !== doing) setTrail([...trail, doing]);
  return trail;
}

export function MissionLive({
  test,
  persona,
  name,
  face,
}: Readonly<{
  test: PersonaTest;
  persona: string;
  name: string;
  face: Face;
}>) {
  const trail = useTrail(test.doing);
  const phase = phaseOf(test);
  const queued = test.status === "queued";
  return (
    <div className="grid gap-4 border-t border-border-soft bg-blue/[0.04] px-5 py-4 first:border-t-0">
      <Head test={test} persona={persona} name={name} face={face} />
      <Phases phase={phase} queued={queued} name={name} />
      {trail.length > 0 && <Trail trail={trail} live={phase === "using"} />}
    </div>
  );
}

// The kobold at work, who is on it, for how long, and the mission's words.
function Head({
  test,
  persona,
  name,
  face,
}: Readonly<{ test: PersonaTest; persona: string; name: string; face: Face }>) {
  const t = useTranslation().t;
  const now = useNow();
  return (
    <div className="flex items-start gap-3.5">
      <span className="relative flex-none">
        <span className="absolute -inset-1 rounded-[14px] bg-blue/15 motion-safe:animate-breathe" />
        <PersonaFace
          face={face}
          size={44}
          className="relative motion-safe:animate-bob"
        />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-baseline gap-3">
          <span className="flex-1 text-[14.5px] font-semibold">
            {test.status === "queued"
              ? t("personas.live.queued", { name })
              : t("personas.live.on", { name })}
          </span>
          <span
            className="flex-none text-[12.5px] text-muted-foreground tabular-nums"
            title={t("personas.live.elapsed")}
          >
            {elapsed(test.started, now)}
          </span>
        </span>
        <a
          href={personaHash(persona, { test: test.id })}
          className="text-[13.5px] text-foreground-2 hover:underline"
        >
          <Markdown text={test.task} inline />
        </a>
      </div>
    </div>
  );
}

// The three parts of a mission: those done filled, the one it is in moving.
function Phases({
  phase,
  queued,
  name,
}: Readonly<{ phase: Phase; queued: boolean; name: string }>) {
  const t = useTranslation().t;
  const at = PHASES.indexOf(phase);
  return (
    <ol className="grid grid-cols-3 gap-2">
      {PHASES.map((one, index) => (
        <li key={one} className="grid gap-1.5">
          <span className="relative h-1.5 overflow-hidden rounded-full bg-line-soft">
            {index < at && <span className="absolute inset-0 bg-blue" />}
            {index === at && !queued && (
              <span className="absolute inset-y-0 w-2/5 rounded-full bg-blue motion-safe:animate-run-light" />
            )}
          </span>
          <span
            className={cn(
              "text-[12px]",
              index === at && !queued
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {t(`personas.live.phases.${one}`, { name })}
          </span>
        </li>
      ))}
    </ol>
  );
}

// The steps said so far; the newest one live while the persona is at it.
function Trail({ trail, live }: Readonly<{ trail: string[]; live: boolean }>) {
  return (
    <ul aria-live="polite" className="grid gap-1 text-[13px]">
      {trail.map((step, index) => {
        const current = live && index === trail.length - 1;
        return (
          <li
            key={step}
            className={cn(
              "flex items-start gap-2 motion-safe:animate-rise",
              current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {current ? (
              <span className="mt-[7px] size-1.5 flex-none rounded-full bg-blue motion-safe:animate-breathe" />
            ) : (
              <Check
                aria-hidden
                className="mt-0.5 size-3.5 flex-none text-blue"
              />
            )}
            {step}
          </li>
        );
      })}
    </ul>
  );
}
