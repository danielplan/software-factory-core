// Prototype, variant B: Releases, a page of its own. On top the coming
// release with the Done cards waiting for it; below, the past versions with
// their notes.

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead } from "@/components/page-head";
import type { FactoryState } from "@/dashboard/dashboard";
import { CARD } from "@/signals/bits";

import { useFactoryView } from "./factory-page";
import {
  madeUpBoard,
  isHigher,
  MadeUpNote,
  MergedList,
  PastReleases,
  ReleaseNow,
  WritingNotes,
  useReleases,
} from "./releases";

export function ReleasesPage({ state }: Readonly<{ state: FactoryState }>) {
  const { data } = useFactoryView(state);
  const done =
    (data && madeUpBoard(data))?.columns.find((column) => column.id === "done")?.cards ?? [];
  const r = useReleases(done);
  const { waiting, releases } = r;
  // The number the team typed; without one, the kobold's.
  const [typed, setTyped] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const shown = (typed ?? r.version).trim();
  const bad =
    r.last !== undefined &&
    (!/^\d+\.\d+\.\d+$/.test(shown) || !isHigher(shown, r.last));
  const release = () => {
    if (bad) {
      setEditing(true);
      return;
    }
    r.make(shown);
    setTyped(null);
    setEditing(false);
  };
  return (
    <>
      <PageHead
        title="Releases"
        about="Which changes went out together, under which version."
      />
      <div className="grid max-w-3xl gap-6 pt-3">
        <section className={`${CARD} grid gap-3 px-5 py-4`}>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="grid min-w-0 gap-1">
              <h2 className="text-[15px] font-semibold">
                Since the last release
              </h2>
              {waiting.length === 0 && !r.writing && (
                <p className="text-xs text-muted-foreground">
                  Nothing new on main since the last release.
                </p>
              )}
              {!r.writing && waiting.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {editing ? (
                    <>
                      <label htmlFor="next-number">Next:</label>
                      <Input
                        id="next-number"
                        aria-invalid={bad}
                        value={typed ?? r.version}
                        onChange={(event) => {
                          setTyped(event.target.value);
                        }}
                        className="w-28"
                      />
                      <Button
                        variant="ring"
                        size="pill-sm"
                        onClick={() => {
                          setTyped(null);
                          setEditing(false);
                        }}
                      >
                        <X aria-hidden />
                        Use {r.version}
                      </Button>
                      {!bad && typed !== null && (
                        <Check aria-hidden className="size-4 text-blue" />
                      )}
                    </>
                  ) : (
                    <>
                      <span>Next: {shown}</span>
                      <span aria-hidden>·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(true);
                        }}
                        className="text-blue underline-offset-2 hover:underline"
                      >
                        Change
                      </button>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{typed === null ? r.why : "Chosen by the team"}</span>
                </div>
              )}
              {bad && editing && !r.writing && (
                <p role="alert" className="text-xs text-destructive">
                  {r.last === undefined
                    ? "Write the number as 1.2.3."
                    : `The number must be higher than the last release, ${r.last}, and written as 1.2.3.`}
                </p>
              )}
            </div>
            {!r.writing && waiting.length > 0 && (
              <ReleaseNow
                count={waiting.length}
                onAsk={release}
                label={`Release ${shown}`}
              />
            )}
          </div>
          {r.writing ? (
            <WritingNotes />
          ) : (
            <MergedList cards={waiting} />
          )}
        </section>
        <section className="grid gap-2">
          <h2 className="text-[15px] font-semibold">Past versions</h2>
          <PastReleases releases={releases} />
          <MadeUpNote />
        </section>
      </div>
    </>
  );
}
