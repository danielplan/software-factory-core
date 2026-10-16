import { useState } from "react";

import { type AddOnView, type KitView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import type { FactoryState } from "./dashboard";
import { GroupForm } from "./settings-card";

// What the factory can do besides its own work, and what it knows: the
// add-ons, each switched on or off here, with its settings while it is
// on (a tracker's come from connecting its board); then the kits, one per
// kind of product, with the products that use each (a kit comes with its
// products, so it is not switched here).
export function AddOnsTab({ state }: Readonly<{ state: FactoryState }>) {
  const on = state.addOns.filter((addOn) => addOn.on).length;
  const used = state.kits.filter((kit) => usersOf(kit, state).length > 0);
  return (
    <div className="grid content-start gap-6">
      <header className="grid gap-1 px-1 pt-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Add-ons
        </h1>
        <p className="text-muted-foreground">
          {`${String(on)} of ${String(state.addOns.length)} add-ons are on, and ${String(used.length)} ${used.length === 1 ? "kit knows" : "kits know"} your products.`}
        </p>
      </header>
      <section aria-label="Add-ons" className="grid gap-4 lg:grid-cols-2">
        {state.addOns.map((addOn) => (
          <AddOnCard key={addOn.id} addOn={addOn} state={state} />
        ))}
      </section>
      <section aria-labelledby="kits" className="grid gap-3">
        <h2 id="kits" className="px-1 text-[17px] font-semibold">
          Kinds of product
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.kits.map((kit) => (
            <KitCard key={kit.id} kit={kit} users={usersOf(kit, state)} />
          ))}
        </div>
      </section>
    </div>
  );
}

// An add-on: what it does, its switch, and its settings while it is on.
function AddOnCard({
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
  // A tracker's settings are filled in by connecting its board.
  const groups =
    addOn.on && !addOn.tracker
      ? state.settings.filter((group) => addOn.settings.includes(group.id))
      : [];
  return (
    <Card aria-label={addOn.name} className="gap-4 shadow-soft">
      <CardHeader>
        <CardTitle className="text-[17px]">{addOn.name}</CardTitle>
        <CardDescription>{addOn.about}</CardDescription>
        <CardAction>
          <Switch
            checked={addOn.on}
            aria-label={`${addOn.name} on`}
            onCheckedChange={turn}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-xs text-muted-foreground">{noteOf(addOn, state)}</p>
        {problem && <ProblemBox title="Not switched" text={problem} />}
        {groups.map((group) => (
          <GroupForm key={group.id} group={group} state={state} />
        ))}
      </CardContent>
    </Card>
  );
}

// A kit: the kind of product it knows, and the products of that kind.
function KitCard({ kit, users }: Readonly<{ kit: KitView; users: string[] }>) {
  return (
    <Card aria-label={kit.name} className="gap-3 shadow-soft">
      <CardHeader>
        <CardTitle className="text-[15px]">{kit.name}</CardTitle>
        <CardDescription>{kit.about}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {users.length > 0
            ? `Used by ${users.join(", ")}.`
            : "No product of this kind yet."}
        </p>
      </CardContent>
    </Card>
  );
}

// The names of the products a kit knows.
function usersOf(kit: KitView, state: FactoryState): string[] {
  return state.products
    .filter((product) => product.kit === kit.id)
    .map((product) => product.name);
}

// Where it comes from, and what it is doing for this factory now.
function noteOf(addOn: AddOnView, state: FactoryState): string {
  const from = addOn.builtIn ? "Comes with the factory." : "An extra.";
  if (state.company.tracker === addOn.id)
    return `${from} Your work is tracked here now.`;
  if (addOn.tracker && addOn.on)
    return `${from} Connect its board under Settings, Where work is tracked.`;
  return from;
}
