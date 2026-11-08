import { Check, ChevronDown, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";

import { type AddOnView, type KitView, messageOf, post } from "@/api";
import { IconTile } from "@/add-ons/looks";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { FactoryState } from "./dashboard";
import { GroupForm } from "./settings-card";

// The factory's store, in two parts: what it uses now (the board work is
// tracked on, the add-ons it has, the kits of its products), then what it
// could use, greyed. Add-ons are added or removed here, with their settings
// while they are on; the board is changed on Settings; kits come with the
// products they know, so they are only shown.
export function AddOnsTab({ state }: Readonly<{ state: FactoryState }>) {
  const used = (addOn: AddOnView) =>
    addOn.tracker ? state.company.tracker === addOn.id : addOn.on;
  const kitUsed = (kit: KitView) => usersOf(kit, state).length > 0;
  const inUse = [
    ...state.addOns.filter(used).map((a) => a.name),
    ...state.kits.filter(kitUsed).map((k) => k.name),
  ];
  return (
    <div className="grid content-start gap-10 pt-[4vh]">
      <header className="grid gap-1.5 px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Add-ons
        </h1>
        <p className="text-muted-foreground">
          {inUse.length > 0
            ? `Your factory uses ${inUse.join(", ")}.`
            : "Your factory uses nothing extra yet."}
        </p>
      </header>
      <Shelf title="In use" about="What your factory works with now.">
        {state.addOns.filter(used).map((addOn) => (
          <AddOnTile key={addOn.id} addOn={addOn} state={state} used />
        ))}
        {state.kits.filter(kitUsed).map((kit) => (
          <KitTile key={kit.id} kit={kit} users={usersOf(kit, state)} />
        ))}
      </Shelf>
      <Shelf
        title="Not used"
        about="What else it can work with: another board, more abilities, other kinds of product."
      >
        {state.addOns
          .filter((addOn) => !used(addOn))
          .map((addOn) => (
            <AddOnTile key={addOn.id} addOn={addOn} state={state} />
          ))}
        {state.kits
          .filter((kit) => !kitUsed(kit))
          .map((kit) => (
            <KitTile key={kit.id} kit={kit} users={[]} />
          ))}
      </Shelf>
    </div>
  );
}

// A row of the store: its name, what is on it, and its tiles.
function Shelf({
  title,
  about,
  children,
}: Readonly<{ title: string; about: string; children: ReactNode }>) {
  return (
    <section aria-label={title} className="grid gap-4">
      <div className="grid gap-0.5 px-1">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{about}</p>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

// One thing in the store: its logo, name and where it comes from, what it
// does, and at the bottom what it is doing here and what to press.
function Tile({
  id,
  name,
  from,
  about,
  idle = false,
  children,
}: Readonly<{
  id: string;
  name: string;
  from: string;
  about: string;
  // Not used: greyed, so what is in use stands out.
  idle?: boolean;
  children: ReactNode;
}>) {
  return (
    <article
      aria-label={name}
      className={cn(
        "grid gap-4 rounded-2xl p-5 transition-[background-color,opacity]",
        idle
          ? "bg-card/50 opacity-75 hover:opacity-100"
          : "bg-card shadow-soft",
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile id={id} big />
        <div className="grid">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground">{from}</span>
        </div>
      </div>
      <p className="min-h-10 text-sm text-foreground/75">{about}</p>
      {children}
    </article>
  );
}

function AddOnTile({
  addOn,
  state,
  used = false,
}: Readonly<{ addOn: AddOnView; state: FactoryState; used?: boolean }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const turn = (on: boolean) => {
    setProblem(null);
    post("/api/add-ons", { id: addOn.id, on }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  const groups =
    addOn.on && !addOn.tracker
      ? state.settings.filter((group) => addOn.settings.includes(group.id))
      : [];
  return (
    <Tile
      id={addOn.id}
      name={addOn.name}
      from={addOn.builtIn ? "Comes with the factory" : "Add-on"}
      about={addOn.about}
      idle={!used}
    >
      <div className="flex min-h-9 items-center gap-3">
        <span className="flex-1 text-xs text-muted-foreground">
          {noteOf(addOn, used)}
        </span>
        <Action addOn={addOn} used={used} turn={turn} />
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {groups.length > 0 && <Settings groups={groups} state={state} />}
    </Tile>
  );
}

// What to press: a board is changed on Settings; another add-on is added
// or removed here.
function Action({
  addOn,
  used,
  turn,
}: Readonly<{
  addOn: AddOnView;
  used: boolean;
  turn: (on: boolean) => void;
}>) {
  if (addOn.tracker)
    return (
      <a
        href="#settings"
        className="rounded-full px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {used ? "Change" : "Use instead"}
      </a>
    );
  return used ? (
    <Button
      variant="ghost"
      className="h-9 px-3 text-[13px] text-muted-foreground"
      onClick={() => {
        turn(false);
      }}
    >
      Remove
    </Button>
  ) : (
    <Button
      className="h-9 rounded-full px-4 text-[13px]"
      onClick={() => {
        turn(true);
      }}
    >
      <Plus aria-hidden /> Add
    </Button>
  );
}

// An added add-on's settings, folded away until wanted.
function Settings({
  groups,
  state,
}: Readonly<{ groups: FactoryState["settings"]; state: FactoryState }>) {
  return (
    <Collapsible className="grid gap-4 border-t border-border-soft pt-3">
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium">
        Settings
        <ChevronDown
          className="size-4 transition group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4">
        {groups.map((group) => (
          <GroupForm key={group.id} group={group} state={state} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function KitTile({ kit, users }: Readonly<{ kit: KitView; users: string[] }>) {
  return (
    <Tile
      id={kit.id}
      name={kit.name}
      from="Kit"
      about={kit.about}
      idle={users.length === 0}
    >
      <div className="flex min-h-9 flex-wrap items-center gap-1.5">
        {users.length > 0 ? (
          users.map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-2 px-2.5 py-1 text-xs"
            >
              {name}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            For a new product of this kind.
          </span>
        )}
      </div>
    </Tile>
  );
}

// The names of the products a kit knows.
function usersOf(kit: KitView, state: FactoryState): string[] {
  return state.products
    .filter((product) => product.kit === kit.id)
    .map((product) => product.name);
}

// What an add-on is doing for this factory now.
function noteOf(addOn: AddOnView, used: boolean): ReactNode {
  if (!used) return null;
  return (
    <span className="inline-flex items-center gap-1 font-medium text-success">
      <Check className="size-3.5" aria-hidden />
      {addOn.tracker ? "Your work is tracked here" : "Added"}
    </span>
  );
}
