// Variant A: Settings › Extensions, today's Add-ons tab grown: in use,
// Kobble's, your own. Each tile says what it adds, what it needs, on or off.

import { ProblemBox } from "@/components/problem-box";
import type { FactoryState } from "@/dashboard/dashboard";
import { cn } from "@/lib/utils";

import { Adds, Logo, Maker, Needs, OnOff } from "./bits";
import { type Ext, useExtensions } from "./data";

export function GrownTab({ state }: Readonly<{ state: FactoryState }>) {
  const { all, turn, problem } = useExtensions(state);
  const shelves = [
    {
      title: "In use",
      about: "What your factory runs now.",
      list: all.filter((e) => e.on),
    },
    {
      title: "Kobble's",
      about: "Made by Kobble. Switch one on to use it.",
      list: all.filter((e) => !e.on && e.maker === "kobble"),
    },
    {
      title: "Your own",
      about: "Written for your team by the kobold.",
      list: all.filter((e) => !e.on && e.maker === "team"),
    },
  ];
  return (
    <div className="grid content-start gap-10">
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {shelves.map((shelf) => (
        <section key={shelf.title} aria-label={shelf.title} className="grid gap-4">
          <div className="grid gap-0.5 px-1">
            <h2 className="text-[15px] font-semibold">{shelf.title}</h2>
            <p className="text-[13px] text-muted-foreground">{shelf.about}</p>
          </div>
          {shelf.list.length === 0 ? (
            <p className="px-1 text-[13px] text-muted-foreground">
              {shelf.title === "Your own"
                ? "Nothing here yet. Tell Sprocket what you want and the kobold writes it as your own extension."
                : "Nothing here."}
            </p>
          ) : (
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shelf.list.map((ext) => (
                <Tile key={ext.id} ext={ext} turn={turn} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function Tile({
  ext,
  turn,
}: Readonly<{ ext: Ext; turn: (id: string, on: boolean) => void }>) {
  return (
    <article
      aria-label={ext.name}
      className={cn(
        "grid gap-3.5 rounded-xl p-5",
        ext.on ? "bg-card shadow-soft" : "bg-card/50 opacity-80 hover:opacity-100",
      )}
    >
      <div className="flex items-center gap-3">
        <Logo ext={ext} big />
        <div className="grid min-w-0 gap-1">
          <span className="truncate font-semibold">{ext.name}</span>
          <Maker ext={ext} />
        </div>
      </div>
      <p className="text-[13px] text-foreground/75">{ext.about}</p>
      <div className="grid gap-2 border-t border-border-soft pt-3">
        <Adds ext={ext} />
        <Needs ext={ext} />
      </div>
      <div className="flex justify-end">
        <OnOff ext={ext} turn={turn} />
      </div>
    </article>
  );
}
