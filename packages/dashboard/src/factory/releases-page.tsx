// Prototype, variant B: Releases, a page of its own. On top the coming
// release with the Done cards waiting for it; below, the past versions with
// their notes.

import { PageHead } from "@/components/page-head";
import type { FactoryState } from "@/dashboard/dashboard";
import { CARD } from "@/signals/bits";

import { useFactoryView } from "./factory-page";
import {
  madeUpBoard,
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
  return (
    <>
      <PageHead
        title="Releases"
        about="Which changes went out together, under which version."
      />
      <div className="grid max-w-3xl gap-6 pt-3">
        <section className={`${CARD} grid gap-3 px-5 py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">
                Since the last release
              </h2>
              <p className="text-xs text-muted-foreground">
                {waiting.length === 0
                  ? "Nothing new on main since the last release."
                  : `${String(waiting.length)} merged ${waiting.length === 1 ? "card" : "cards"}. A release is everything on main now.`}
              </p>
            </div>
            {!r.writing && (
              <ReleaseNow count={waiting.length} onAsk={() => {
                  r.make(r.version);
                }} />
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
