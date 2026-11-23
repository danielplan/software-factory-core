// What Tinker did about starting the app, when the project had no start
// command: one calm line on the first prototype that started this way, and,
// only when Tinker could not get the app to start, a calm box that says so
// in plain words with one way on, Try again, which runs the starting steps
// once more. No person is asked for anything.

import { Info, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { VersionRun } from "@/api/client";
import { Button } from "@/components/ui/button";
import { MAKER } from "@/lib/kobolds";

// What to say of the start: Tinker's line (on the prototype it set the
// start up for, while it starts or runs), or its reason when it could not
// get the app to start (not while it starts, runs or is being made).
export function startNotes(
  thing: { startSetUp?: boolean },
  run: VersionRun | undefined,
): { line: boolean; reason: string | null } {
  const busy = run?.state === "starting" || run?.state === "running";
  return {
    line: thing.startSetUp === true && busy,
    reason:
      run && !busy && !run.making && run.startProblem !== null
        ? run.startProblem
        : null,
  };
}

export function StartNotes({
  notes,
  retry,
}: Readonly<{
  notes: ReturnType<typeof startNotes>;
  retry: () => void;
}>) {
  return (
    <>
      {notes.line && <TinkerLine />}
      {notes.reason !== null && (
        <CouldNot reason={notes.reason} retry={retry} />
      )}
    </>
  );
}

// Tinker's line: what it did, for the whole team.
export function TinkerLine() {
  const t = useTranslation().t;
  return (
    <p className="flex items-start gap-1.5 text-xs text-foreground-2">
      <Sparkles aria-hidden className="mt-0.5 size-3 flex-none text-blue" />
      {t("explore.board.tinkerSetUp", { name: MAKER.name })}
    </p>
  );
}

// What Tinker could not do: its own reason when it gave one, else that none
// of its ways came up.
export function CouldNot({
  reason,
  retry,
}: Readonly<{ reason: string; retry: () => void }>) {
  const t = useTranslation().t;
  return (
    <div
      role="status"
      className="nodrag flex items-start gap-2 rounded-lg bg-[#f3f4f7] px-3 py-2 text-xs text-foreground-2"
    >
      <Info aria-hidden className="mt-0.5 size-3.5 flex-none text-faint" />
      <div className="grid min-w-0 flex-1 gap-2">
        <p>
          {reason === ""
            ? t("explore.board.couldNotNoReason", { name: MAKER.name })
            : `${t("explore.board.couldNotTitle", { name: MAKER.name })} ${reason}`}
        </p>
        <div>
          <Button size="pill-sm" variant="ring" onClick={retry}>
            {t("explore.board.tryAgain")}
          </Button>
        </div>
      </div>
    </div>
  );
}
