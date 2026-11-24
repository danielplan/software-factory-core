// The switches of a prototype, outside the app: which variant and which
// made-up data it shows. The same pieces (variant letters, the data menu)
// sit in a toolbar (A, and C under the screen) or a tab bar joined to the
// screen (B); prototype-layout.ts says which.

import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

export type Variant = { key: string; name: string; difference?: string };

type Switches = Readonly<{
  variants: Variant[];
  shown: string;
  agreed: string | undefined;
  onPick: (key: string) => void;
  states: string[];
  state: string;
  onState: (state: string) => void;
}>;

// One segment: a letter or a short word, the picked one raised.
function Segment({
  on,
  role,
  title,
  onPick,
  children,
}: Readonly<{
  on: boolean;
  role?: "tab";
  title?: string;
  onPick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      title={title}
      onClick={onPick}
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center gap-1 rounded-[7px] px-2 text-xs",
        on
          ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgb(20_24_36/0.12)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function titleOf(one: Variant): string {
  return [`${one.key} · ${one.name}`, one.difference]
    .filter(Boolean)
    .join(": ");
}

// Once a variant is agreed, the others are archived behind a "+N" that shows
// them again; nothing is removed.
function useListed({ variants, agreed }: Pick<Switches, "variants" | "agreed">) {
  const [all, showAll] = useState(false);
  const archived = agreed !== undefined && !all;
  const listed = archived
    ? variants.filter((one) => one.key === agreed)
    : variants;
  const others = variants.length - 1;
  return {
    listed,
    archived,
    others: agreed !== undefined && others > 0 ? others : 0,
    toggle: () => {
      showAll(archived);
    },
  };
}

function ArchiveToggle({
  archived,
  others,
  toggle,
  children,
}: Readonly<{
  archived: boolean;
  others: number;
  toggle: () => void;
  children: ReactNode;
}>) {
  const b = useT().explore.board;
  if (others === 0) return null;
  return (
    <button
      type="button"
      title={archived ? b.showArchived(others) : b.hideArchived}
      onClick={toggle}
      className="inline-flex h-6 min-w-7 flex-none items-center justify-center rounded-[7px] px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}

// The variants as raised segments on a grey track (A and C).
function Letters(props: Switches) {
  const b = useT().explore.board;
  const { listed, archived, others, toggle } = useListed(props);
  return (
    <div
      role="tablist"
      aria-label={b.variant}
      className="flex flex-none gap-0.5 rounded-[9px] bg-[#eceef2] p-0.5"
    >
      {listed.map((one) => (
        <Segment
          key={one.key}
          role="tab"
          on={one.key === props.shown}
          title={titleOf(one)}
          onPick={() => {
            props.onPick(one.key);
          }}
        >
          {one.key}
          {one.key === props.agreed && (
            <Check aria-hidden className="size-3 flex-none text-[#197653]" />
          )}
        </Segment>
      ))}
      <ArchiveToggle archived={archived} others={others} toggle={toggle}>
        {archived ? `+${String(others)}` : "−"}
      </ArchiveToggle>
    </div>
  );
}

// The made-up data, one menu: the first entry is the data it opens with.
function DataMenu({
  states,
  state,
  onState,
}: Pick<Switches, "states" | "state" | "onState">) {
  const t = useT().explore.board;
  if (states.length === 0) return null;
  return (
    <label className="nodrag flex flex-none items-center gap-1.5 text-[11px] text-muted-foreground">
      {t.data}
      <select
        value={state}
        onChange={(event) => {
          onState(event.target.value);
        }}
        className="h-6 max-w-32 rounded-[7px] border border-border bg-card px-1.5 text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-[#e8e9ee]"
      >
        <option value="">{t.usualState}</option>
        {states.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

// Whether the switches have anything to show.
export function hasSwitches({ variants, states }: Switches): boolean {
  return variants.length > 0 || states.length > 0;
}

// One slim row: the letters and the shown variant's name (what it is, on
// hover), the data menu on the right. Under the header (A) or at the screen's
// foot (C), where it is joined to the screen.
export function Toolbar(props: Switches & { joined?: "bottom" }) {
  const about = props.variants.find((one) => one.key === props.shown);
  return (
    <div
      className={cn(
        "nodrag flex min-w-0 items-center gap-2 bg-[#f3f4f7] p-1",
        props.joined === "bottom" ? "rounded-b-[9px]" : "rounded-[9px]",
      )}
    >
      {props.variants.length > 0 && <Letters {...props} />}
      {about && (
        <span
          title={titleOf(about)}
          className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
        >
          {about.name}
        </span>
      )}
      {!about && <span className="flex-1" />}
      <DataMenu {...props} />
    </div>
  );
}

// Browser-like tabs on the screen's top edge, joined to it; the shown tab
// carries the variant's name, the data menu and a status sit in the bar.
export function TabBar({
  status,
  ...props
}: Switches & { status: ReactNode }) {
  const b = useT().explore.board;
  const { listed, archived, others, toggle } = useListed(props);
  return (
    <div className="nodrag flex min-w-0 items-end gap-2 rounded-t-[9px] bg-[#eceef2] px-1.5 pt-1.5">
      <div
        role="tablist"
        aria-label={b.variant}
        className="flex min-w-0 flex-none items-end gap-0.5"
      >
        {listed.map((one) => {
          const on = one.key === props.shown;
          return (
            <button
              key={one.key}
              type="button"
              role="tab"
              aria-selected={on}
              title={titleOf(one)}
              onClick={() => {
                props.onPick(one.key);
              }}
              className={cn(
                "inline-flex h-7 max-w-40 min-w-8 items-center justify-center gap-1 rounded-t-lg px-2.5 text-xs",
                on
                  ? "bg-card font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
              )}
            >
              <span className="flex-none">{one.key}</span>
              {on && <span className="truncate">{one.name}</span>}
              {one.key === props.agreed && (
                <Check
                  aria-hidden
                  className="size-3 flex-none text-[#197653]"
                />
              )}
            </button>
          );
        })}
        <ArchiveToggle archived={archived} others={others} toggle={toggle}>
          {archived ? `+${String(others)}` : "−"}
        </ArchiveToggle>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 self-center pb-1">
        {status}
        <DataMenu {...props} />
      </div>
    </div>
  );
}
