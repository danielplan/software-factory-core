// Where a signal from a mission happened ("At step 2: Opened the basket"),
// under its words; as a link to the mission where it is picked.

import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import type { SignalRow } from "@/api/client";

import { personaPath } from "@/lib/routes";

import { stepWords } from "@/lib/signals-view";

export function StepOf({
  signal,
  link = false,
}: Readonly<{ signal: SignalRow; link?: boolean }>) {
  const t = useTranslation().t;
  const words = stepWords(signal, t);
  if (!words) return null;
  if (!link || !signal.persona || !signal.step)
    return (
      <span className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
        {words}
      </span>
    );
  return (
    <Link
      to={personaPath(signal.persona, { test: signal.step.test })}
      className="mt-2 block text-[13px] text-muted-foreground hover:underline"
    >
      {words}
    </Link>
  );
}
