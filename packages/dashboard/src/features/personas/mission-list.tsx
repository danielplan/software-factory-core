// One mission in a persona's list: its words and when; running, the step
// it is on; done, what it found (bug, idea, open question), each at its
// step and linking to Signals; failed, why.

import type { PersonaTest, SignalRow } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { TypeChip } from "@/components/page-bits";
import { missionWords, stepWords } from "@/lib/signals-view";
import { useLocale, useT } from "@/i18n/use-t";
import { momentIn } from "@/i18n/format";

export function Mission({
  test,
  persona,
  found,
}: Readonly<{ test: PersonaTest; persona: string; found: SignalRow[] }>) {
  const locale = useLocale();
  const t = useT();
  const going = test.status === "queued" || test.status === "running";
  return (
    <div
      className={cn(
        "grid gap-2.5 border-t border-border-soft px-5 py-4 first:border-t-0",
        going && "bg-surface",
      )}
    >
      <span className="flex items-baseline gap-3">
        <a
          href={personaHash(persona, { test: test.id })}
          className="flex-1 text-[14.5px] hover:underline"
        >
          <Markdown text={test.task} inline />
        </a>
        <span
          className={cn(
            "flex-none text-[12.5px]",
            going ? "font-semibold text-blue" : "text-muted-foreground",
          )}
        >
          {going
            ? t.personas.onMission
            : momentIn(
                locale,
                new Date(test.started ?? test.ended ?? 0).toISOString(),
              )}
        </span>
      </span>
      {going && (
        <p aria-live="polite" className="text-[13px] text-foreground-2">
          {missionWords(
            { status: test.status, doing: test.doing ?? null },
            t.words,
          )}
        </p>
      )}
      {test.status === "failed" && (
        <p className="text-[13px] text-muted-foreground">
          {t.personas.missions.couldNotFinish(
            test.problem ?? t.personas.missions.noReason,
          )}
        </p>
      )}
      {test.status === "done" && <Found found={found} />}
    </div>
  );
}

function Found({ found }: Readonly<{ found: SignalRow[] }>) {
  const t = useT();
  if (found.length === 0)
    return (
      <span className="text-[13px] text-muted-foreground">
        {t.personas.missions.nothingFound}
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
                    {stepWords(signal, t.words)}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
    </ul>
  );
}
