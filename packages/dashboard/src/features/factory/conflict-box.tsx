// A card whose pull request clashes with main: one line that says so, and
// Resolve, which puts the card back in To do with the ask; the builder takes
// it into In progress, brings in main and settles the clash.

import { GitMerge, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api/client";
import { useT } from "@/i18n/use-t";

export function ConflictBox({ number }: Readonly<{ number: number }>) {
  const t = useT().factory.conflict;
  const [state, setState] = useState<"idle" | "asking" | "asked">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const resolve = () => {
    setState("asking");
    setProblem(null);
    post("/api/kobble/factory/resolve", { number }).then(
      () => {
        setState("asked");
        post("/api/work/refresh").catch(() => undefined);
      },
      (error: unknown) => {
        setState("idle");
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <span
      className="flex w-full flex-col gap-1.5 rounded-md bg-type-bug/8 px-2 py-1.5 text-xs leading-snug text-type-bug"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <TriangleAlert
          aria-hidden
          strokeWidth={2}
          className="size-3 flex-none"
        />
        {state === "asked" ? t.asked : t.clashes}
        {state !== "asked" && (
          <button
            type="button"
            disabled={state === "asking"}
            onClick={resolve}
            className="ml-auto inline-flex h-[22px] items-center gap-1 rounded-md border border-type-bug/30 bg-card px-2 font-medium text-type-bug hover:bg-type-bug/10 disabled:opacity-60"
          >
            {state === "asking" ? (
              <LoaderCircle aria-hidden className="size-3 animate-spin" />
            ) : (
              <GitMerge aria-hidden strokeWidth={2} className="size-3" />
            )}
            {t.resolve}
          </button>
        )}
      </span>
      {problem && <span className="text-muted-foreground">{problem}</span>}
    </span>
  );
}

// A card whose clash the builder was asked to settle: what happens now.
export function ResolvingLine() {
  const t = useT().factory.conflict;
  return (
    <span className="flex w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs leading-snug text-muted-foreground">
      <GitMerge aria-hidden strokeWidth={2} className="size-3 flex-none" />
      {t.resolving}
    </span>
  );
}
