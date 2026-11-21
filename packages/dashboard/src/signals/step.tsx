// Where a signal from a mission happened ("At step 2: Opened the basket"),
// under its words; as a link to the mission where it is picked.

import type { SignalRow } from "@/api";
import { useT } from "@/i18n/use-t";
import { personaHash } from "@/lib/routes";

import { stepWords } from "./view";

export function StepOf({
  signal,
  link = false,
}: Readonly<{ signal: SignalRow; link?: boolean }>) {
  const t = useT();
  const words = stepWords(signal, t.words);
  if (!words) return null;
  if (!link || !signal.persona || !signal.step)
    return (
      <span className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
        {words}
      </span>
    );
  return (
    <a
      href={personaHash(signal.persona, { test: signal.step.test })}
      className="mt-2 block text-[13px] text-muted-foreground hover:underline"
    >
      {words}
    </a>
  );
}
