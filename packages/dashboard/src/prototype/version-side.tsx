// Beside the version shown: Main and every version of the idea, each with
// what it is doing (stopped, starting, running, being made), and "Make
// another version": what it should do, for the kobold to make on its own
// branch. Nobody sees a version on Explore until it is shared.

import { useState } from "react";

import { messageOf, post, type PrototypePage, type VersionRun } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { runOf, runWords } from "@/explore/view";
import { prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function VersionSide({
  page,
  runs,
  shown,
}: Readonly<{
  page: PrototypePage;
  runs: VersionRun[];
  shown: string | null;
}>) {
  const rows = [
    { key: null, name: "What is in the product now", state: "" },
    ...page.versions.map((v) => ({
      key: v.key,
      name: v.name,
      state: `${runWords(runOf(runs, page.idea.id, v.key))}${v.sharedAt ? " · shared" : ""}`,
    })),
  ];
  return (
    <aside className="grid content-start gap-5 overflow-y-auto border-l bg-card px-5 py-5">
      <div className="grid gap-1">
        <span className="px-3 text-xs text-muted-foreground">
          Versions of {page.idea.title}
        </span>
        {rows.map((row) => (
          <a
            key={row.key ?? "main"}
            href={prototypeHash(page.idea.id, row.key ?? undefined)}
            aria-current={row.key === shown ? "page" : undefined}
            className={cn(
              "grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 rounded-xl px-3 py-2.5 text-sm hover:bg-surface",
              row.key === shown && "bg-surface ring-1 ring-foreground",
            )}
          >
            <b>{row.key ?? "Main"}</b>
            <span>{row.name}</span>
            {row.state && (
              <span className="col-start-2 text-xs text-muted-foreground">
                {row.state}
              </span>
            )}
          </a>
        ))}
      </div>
      <MakeAnother idea={page.idea.id} />
      <p className="text-[13px] text-muted-foreground">
        Runs only on your machine. Nobody sees a version until you share it.
      </p>
    </aside>
  );
}

function MakeAnother({ idea }: Readonly<{ idea: string }>) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const make = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const { version } = await post<{ version: { key: string } }>(
        "/api/prototypes/make",
        { idea, text },
      );
      setText("");
      window.location.hash = prototypeHash(idea, version.key);
    } catch (error) {
      setProblem(messageOf(error));
    }
    setBusy(false);
  };
  return (
    <div className="grid gap-2.5 rounded-2xl bg-surface px-4 py-3.5">
      <span className="text-sm font-semibold">Make another version</span>
      <textarea
        aria-label="What the version should do"
        value={text}
        rows={3}
        placeholder="Describe it, for example “save things with a long press”"
        onChange={(event) => {
          setText(event.target.value);
        }}
        className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={!text.trim() || busy}
        onClick={() => void make()}
      >
        Ask the kobold
      </Button>
      {problem && <ProblemBox title="That did not work" text={problem} />}
    </div>
  );
}
