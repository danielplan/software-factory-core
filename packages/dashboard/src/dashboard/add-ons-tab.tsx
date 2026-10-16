import { Check, ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";

import { type AddOnView, type KitView, messageOf, post } from "@/api";
import { IconTile } from "@/add-ons/looks";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { FactoryState } from "./dashboard";
import { GroupForm } from "./settings-card";

// The factory's store: what it can be given, as tiles with a logo, grouped
// by what they are for. Add-ons are added or removed here, with their
// settings while they are on (a tracker's come from connecting its board);
// kits come with the products they know, so they are only shown.
export function AddOnsTab({ state }: Readonly<{ state: FactoryState }>) {
  const added = state.addOns.filter((addOn) => addOn.on).length;
  const trackers = state.addOns.filter((addOn) => addOn.tracker);
  const others = state.addOns.filter((addOn) => !addOn.tracker);
  return (
    <div className="grid content-start gap-10 pt-[4vh]">
      <header className="grid gap-1.5 px-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Add-ons
        </h1>
        <p className="text-muted-foreground">
          {`What your factory can do and knows. ${String(added)} of ${String(state.addOns.length)} add-ons are added.`}
        </p>
      </header>
      <Shelf
        title="Where work is tracked"
        about="The board your team already uses. Without one, work stays on the factory's own board."
      >
        {trackers.map((addOn) => (
          <AddOnTile key={addOn.id} addOn={addOn} state={state} />
        ))}
      </Shelf>
      {others.length > 0 && (
        <Shelf title="More abilities" about="Anything else the factory can do.">
          {others.map((addOn) => (
            <AddOnTile key={addOn.id} addOn={addOn} state={state} />
          ))}
        </Shelf>
      )}
      <Shelf
        title="Kinds of product"
        about="Each kit knows one kind of product: how to start it, check it and build on it. They come with your products."
      >
        {state.kits.map((kit) => (
          <KitTile key={kit.id} kit={kit} users={usersOf(kit, state)} />
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
  children,
}: Readonly<{
  id: string;
  name: string;
  from: string;
  about: string;
  children: ReactNode;
}>) {
  return (
    <article
      aria-label={name}
      className="grid gap-4 rounded-2xl bg-card p-5 shadow-soft"
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
}: Readonly<{ addOn: AddOnView; state: FactoryState }>) {
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
    >
      <div className="flex min-h-9 items-center gap-3">
        <span className="flex-1 text-xs text-muted-foreground">
          {noteOf(addOn, state)}
        </span>
        {addOn.on ? (
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
            Add
          </Button>
        )}
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {groups.length > 0 && <Settings groups={groups} state={state} />}
    </Tile>
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
    <Tile id={kit.id} name={kit.name} from="Kit" about={kit.about}>
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
            No product of this kind yet.
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
function noteOf(addOn: AddOnView, state: FactoryState): ReactNode {
  if (state.company.tracker === addOn.id)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-success">
        <Check className="size-3.5" aria-hidden /> Your work is tracked here
      </span>
    );
  if (!addOn.on) return null;
  if (addOn.tracker)
    return (
      <a href="#settings" className="hover:text-foreground hover:underline">
        Added · connect its board
      </a>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <Check className="size-3.5" aria-hidden /> Added
    </span>
  );
}
