// The details of one thing in the Marketplace: one layout for an extension,
// a connection and a kit. Its header (icon, name, line, who made it, state
// and main action), chip sections (what it brings, needs, who needs or
// uses it, its settings), and a quiet red Remove at the bottom.

import { Check, Users } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AddOnView, FactoryState } from "@/api/client";
import { IconTile } from "@/components/add-on-looks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupForm } from "@/components/settings-card";
import { listIn } from "@/i18n/format";
import { useLocale } from "@/i18n/use-t";
import {
  alwaysLine,
  type Link,
  refusal,
  removing,
  type Thing,
} from "@/lib/market-view";

import { Chip, Row, Section, UsedBy } from "./chips";
import { Confirm } from "@/components/confirm";

export function DetailsDialog({
  thing,
  addOn,
  addOns,
  state,
  action,
  onClose,
  onOpen,
  onRemove,
}: Readonly<{
  thing: Thing | null;
  // The extension itself, when the thing is one.
  addOn: AddOnView | null;
  addOns: AddOnView[];
  state: FactoryState;
  // The main action: Install, Switch to…
  action: ReactNode;
  onClose: () => void;
  // A chip that leads to another thing, or to the Connections tab.
  onOpen: (to: string) => void;
  onRemove: (addOn: AddOnView) => void;
}>) {
  return (
    <Dialog
      open={thing !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-[20px] p-0 sm:max-w-[600px]">
        {thing && (
          <div className="grid">
            <Header thing={thing} action={action} />
            <Body thing={thing} state={state} onOpen={onOpen} />
            {addOn?.on && (
              <Removal
                name={thing.name}
                addOn={addOn}
                addOns={addOns}
                onRemove={onRemove}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The quiet red Remove at the bottom. One that others need is refused, with
// why; any other asks first and says what goes and what stays. Factory has
// no Remove, only why.
function Removal({
  name,
  addOn,
  addOns,
  onRemove,
}: Readonly<{
  name: string;
  addOn: AddOnView;
  addOns: AddOnView[];
  onRemove: (addOn: AddOnView) => void;
}>) {
  const t = useTranslation().t;
  const locale = useLocale();
  const list = (items: string[]) => listIn(locale, items);
  const [refused, setRefused] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  return (
    <div className="grid gap-2 border-t border-border-soft px-6 py-4">
      {refused && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
        >
          {refused}
        </p>
      )}
      {addOn.always ? (
        <span className="text-xs text-muted-foreground">
          {alwaysLine(t, addOn.id)}
        </span>
      ) : (
        <button
          type="button"
          className="w-fit text-[13px] text-destructive hover:underline"
          onClick={() => {
            const why = refusal(t, addOns, addOn, list);
            setRefused(why);
            setAsking(why === null);
          }}
        >
          {t("market.remove")}
        </button>
      )}
      <Confirm
        question={
          asking
            ? {
                title: t("market.removeTitle", { name }),
                lines: removing(t, addOn, list),
                yes: t("market.remove"),
                onYes: () => {
                  onRemove(addOn);
                },
              }
            : null
        }
        onClose={() => {
          setAsking(false);
        }}
      />
    </div>
  );
}

// Icon, name, who made it and the line; its state and main action beside.
function Header({
  thing,
  action,
}: Readonly<{ thing: Thing; action: ReactNode }>) {
  const t = useTranslation().t;
  return (
    <div className="flex flex-wrap items-start gap-4 p-6 pr-14">
      <IconTile id={thing.look} big />
      <div className="grid min-w-0 flex-1 basis-[220px] gap-1">
        <DialogTitle className="truncate">{thing.name}</DialogTitle>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {thing.maker === "team" && <Users aria-hidden className="size-3" />}
          {thing.maker === "team"
            ? t("market.madeByTeam")
            : t("market.madeByKobble")}
        </span>
        <DialogDescription className="text-[13px]">
          {thing.about}
        </DialogDescription>
      </div>
      {(thing.state !== null || action) && (
        <div className="grid justify-items-end gap-2">
          {thing.state !== null && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              {t(`market.states.${thing.state}`)}
              <span
                aria-hidden
                className="grid size-5 place-items-center rounded-full bg-success text-white"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </span>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

// The chip sections, each only when the thing has it.
function Body({
  thing,
  state,
  onOpen,
}: Readonly<{
  thing: Thing;
  state: FactoryState;
  onOpen: (to: string) => void;
}>) {
  const t = useTranslation().t;
  const groups = state.settings.filter((group) =>
    thing.settings.includes(group.id),
  );
  return (
    <>
      <Brings thing={thing} />
      <Who thing={thing} onOpen={onOpen} />
      {groups.length > 0 && (
        <Section title={t("market.sectionsOf.settings")}>
          <div className="grid gap-4">
            {groups.map((group) => (
              <GroupForm key={group.id} group={group} state={state} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// What it brings: a row for each kind, or just chips for a kit.
function Brings({ thing }: Readonly<{ thing: Thing }>) {
  const t = useTranslation().t;
  if (thing.brings.length === 0) return null;
  return (
    <Section title={t("market.sectionsOf.brings")}>
      {thing.kind === "kit" ? (
        <div className="flex flex-wrap gap-1.5">
          {thing.brings.flatMap((row) =>
            row.names.map((name) => <Chip key={name} label={name} />),
          )}
        </div>
      ) : (
        <div className="grid gap-1.5">
          {thing.brings.map((row) => (
            <Row key={row.label} label={row.label}>
              {row.names.map((name) => (
                <Chip key={name} label={name} />
              ))}
            </Row>
          ))}
        </div>
      )}
    </Section>
  );
}

// What it needs, who needs it, and who uses it.
function Who({
  thing,
  onOpen,
}: Readonly<{ thing: Thing; onOpen: (to: string) => void }>) {
  const t = useTranslation().t;
  const chips = (links: Link[]) => (
    <div className="flex flex-wrap gap-1.5">
      {links.map(({ label, to }) => (
        <Chip
          key={label}
          label={label}
          onClick={
            to === null
              ? undefined
              : () => {
                  onOpen(to);
                }
          }
        />
      ))}
    </div>
  );
  const none = (line: string) => (
    <span className="text-xs text-muted-foreground">{line}</span>
  );
  const { usedBy, neededBy } = thing;
  return (
    <>
      {thing.needs.length > 0 && (
        <Section title={t("market.sectionsOf.needs")}>
          {chips(thing.needs)}
        </Section>
      )}
      {neededBy !== null && (
        <Section title={t("market.sectionsOf.neededBy")}>
          {neededBy.length === 0
            ? none(t("market.nothingNeedsIt"))
            : chips(neededBy)}
        </Section>
      )}
      {usedBy?.kind === "things" && (
        <Section title={t("market.sectionsOf.usedBy")}>
          {chips(usedBy.links)}
        </Section>
      )}
      {usedBy?.kind === "products" && (
        <Section title={t("market.sectionsOf.usedBy")}>
          {usedBy.names.length > 0 ? (
            <UsedBy products={usedBy.names} label={false} />
          ) : (
            none(t("market.noProduct"))
          )}
        </Section>
      )}
    </>
  );
}
