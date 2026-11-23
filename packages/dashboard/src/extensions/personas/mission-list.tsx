// One mission in a persona's list: its words and when; running, the live
// panel (mission-live.tsx); done, what it found (bug, idea, open question), each at its
// step and linking to Signals; failed, why.

import { useTranslation } from "react-i18next";

import type { Face, PersonaTest, SignalRow } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { personaHash } from "@/lib/routes";
import { TypeChip } from "@/components/page-bits";
import { stepWords } from "@/lib/signals-view";
import { useLocale } from "@/i18n/use-t";
import { momentIn } from "@/i18n/format";

import { MissionLive } from "./mission-live";

export function Mission({
  test,
  persona,
  found,
}: Readonly<{
  test: PersonaTest;
  persona: { id: string; name: string; face: Face };
  found: SignalRow[];
}>) {
  const locale = useLocale();
  const t = useTranslation().t;
  const going = test.status === "queued" || test.status === "running";
  if (going)
    return (
      <MissionLive
        test={test}
        persona={persona.id}
        name={persona.name}
        face={persona.face}
      />
    );
  return (
    <div className="grid gap-2.5 border-t border-border-soft px-5 py-4 first:border-t-0">
      <span className="flex items-baseline gap-3">
        <a
          href={personaHash(persona.id, { test: test.id })}
          className="flex-1 text-[14.5px] hover:underline"
        >
          <Markdown text={test.task} inline />
        </a>
        <span className="flex-none text-[12.5px] text-muted-foreground">
          {momentIn(
            locale,
            new Date(test.started ?? test.ended ?? 0).toISOString(),
          )}
        </span>
      </span>
      {test.status === "failed" && (
        <p className="text-[13px] text-muted-foreground">
          {t("personas.missions.couldNotFinish", {
            why: test.problem ?? t("personas.missions.noReason"),
          })}
        </p>
      )}
      {test.status === "done" && <Found found={found} />}
    </div>
  );
}

function Found({ found }: Readonly<{ found: SignalRow[] }>) {
  const t = useTranslation().t;
  if (found.length === 0)
    return (
      <span className="text-[13px] text-muted-foreground">
        {t("personas.missions.nothingFound")}
      </span>
    );
  return (
    <ul className="grid gap-1.5">
      {[...found]
        .sort((a, b) => (a.step?.number ?? 0) - (b.step?.number ?? 0))
        .map((signal) => (
          <li key={signal.id}>
            <a
              href={`#signals/${encodeURIComponent(signal.id)}`}
              className="group -mx-2 flex items-start gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-surface"
            >
              <TypeChip type={signal.type} />
              <span className="grid min-w-0 gap-0.5 text-[13.5px]">
                <span className="text-foreground-2 group-hover:underline">
                  <Markdown text={signal.text} inline />
                </span>
                {signal.step && (
                  <span className="text-[12px] text-muted-foreground">
                    {stepWords(signal, t)}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
    </ul>
  );
}
