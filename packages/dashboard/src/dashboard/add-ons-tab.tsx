import { Check, ChevronDown, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { t } from "@/i18n/i18n";

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

// The factory's store (on Settings, under the settings), in two parts: what it uses now (the board work is
// tracked on, the add-ons it has, the kits of its products), then what it
// could use, greyed. Add-ons are added or removed here, with their settings
// while they are on; the board is changed on Settings; kits come with the
// products they know, so they are only shown.
export function AddOnsTab({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation("settings");
  const used = (addOn: AddOnView) =>
    addOn.tracker ? state.company.tracker === addOn.id : addOn.on;
  const kitUsed = (kit: KitView) => usersOf(kit, state).length > 0;
  return (
    <div className="grid content-start gap-6">
      <Shelf title={t("workshop.inUse")}>
        {state.addOns.filter(used).map((addOn) => (
          <AddOnTile key={addOn.id} addOn={addOn} state={state} used />
        ))}
        {state.kits.filter(kitUsed).map((kit) => (
          <KitTile key={kit.id} kit={kit} users={usersOf(kit, state)} />
        ))}
      </Shelf>
      <Shelf title={t("workshop.available")}>
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

// A row of the store: its name, small, and its tiles.
function Shelf({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section aria-label={title} className="grid gap-3">
      <h3 className="px-1 text-tag tracking-[0.06em] text-label uppercase">
        {title}
      </h3>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

// One thing in the store: its logo, name and where it comes from, what it
// does in a line, and at the bottom what it is doing here and what to press.
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
        "grid gap-3 rounded-2xl p-5 transition-[background-color,opacity]",
        idle
          ? "bg-card/50 opacity-75 hover:opacity-100"
          : "bg-card shadow-soft",
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile id={id} big />
        <div className="grid">
          <span className="text-item">{name}</span>
          <span className="text-tag text-muted-foreground">{from}</span>
        </div>
      </div>
      <p className="text-note text-muted-foreground">{about}</p>
      {children}
    </article>
  );
}

function AddOnTile({
  addOn,
  state,
  used = false,
}: Readonly<{ addOn: AddOnView; state: FactoryState; used?: boolean }>) {
  const { t } = useTranslation(["settings", "common"]);
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
      from={addOn.builtIn ? t("workshop.builtIn") : t("workshop.addOn")}
      about={addOn.about}
      idle={!used}
    >
      <div className="flex min-h-9 items-center gap-3">
        <span className="flex-1 text-tag text-muted-foreground">
          {noteOf(addOn, used)}
        </span>
        <Action addOn={addOn} used={used} turn={turn} />
      </div>
      {problem && <ProblemBox title={t("common:didNotWork")} text={problem} />}
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
  const { t } = useTranslation("settings");
  if (addOn.tracker)
    return (
      <a
        href="#settings"
        className="rounded-full px-3 py-2 text-note text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {used ? t("workshop.change") : t("workshop.useInstead")}
      </a>
    );
  return used ? (
    <Button
      variant="ghost"
      className="h-9 px-3 text-note text-muted-foreground"
      onClick={() => {
        turn(false);
      }}
    >
      {t("workshop.remove")}
    </Button>
  ) : (
    <Button
      className="h-9 rounded-full px-4 text-note"
      onClick={() => {
        turn(true);
      }}
    >
      <Plus aria-hidden /> {t("workshop.add")}
    </Button>
  );
}

// An added add-on's settings, folded away until wanted.
function Settings({
  groups,
  state,
}: Readonly<{ groups: FactoryState["settings"]; state: FactoryState }>) {
  const { t } = useTranslation("settings");
  return (
    <Collapsible className="grid gap-4 border-t border-border-soft pt-3">
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-body font-medium">
        {t("workshop.settings")}
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
  const { t } = useTranslation("settings");
  return (
    <Tile
      id={kit.id}
      name={kit.name}
      from={t("workshop.kit")}
      about={kit.about}
      idle={users.length === 0}
    >
      <div className="flex min-h-9 flex-wrap items-center gap-1.5">
        {users.length > 0 ? (
          users.map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-2 px-2.5 py-1 text-tag"
            >
              {name}
            </span>
          ))
        ) : (
          <span className="text-tag text-muted-foreground">
            {t("workshop.forNew")}
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
      {addOn.tracker
        ? t("settings:workshop.tracked")
        : t("settings:workshop.added")}
    </span>
  );
}
