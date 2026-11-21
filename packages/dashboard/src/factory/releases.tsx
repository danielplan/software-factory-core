// Prototype: releases of the product, made up. The cards that are Done and
// not in a release yet wait for the next one; Make release bundles them
// under the next version number, with notes made from their titles. Shared
// by both variants (the Done column and the Releases page).

import { ChevronRight, LoaderCircle, PackageCheck, Tag } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { FactoryView } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Waiting = { number: number; title: string };
type Release = {
  version: string;
  date: string;
  cards: Waiting[];
  notes: Group[];
};
type Group = { heading: string; items: string[] };

// Made up, and said so where they show.
const PAST: Release[] = [
  {
    version: "v0.3.0",
    date: "12 Nov 2026",
    cards: [
      { number: 88, title: "Show the order's status on the confirmation page" },
      { number: 85, title: "Let customers change their delivery address" },
      { number: 81, title: "Fix the total when a voucher and a discount meet" },
    ],
    notes: [
      {
        heading: "New",
        items: [
          "You can see where your order is on the confirmation page.",
          "You can change the delivery address after you have paid.",
        ],
      },
      {
        heading: "Fixed",
        items: ["The total is right when a voucher and a discount meet."],
      },
    ],
  },
  {
    version: "v0.2.0",
    date: "29 Oct 2026",
    cards: [
      { number: 74, title: "Search the shop by product name" },
      { number: 71, title: "Remember the basket after signing in" },
    ],
    notes: [
      {
        heading: "New",
        items: ["You can search the shop by product name."],
      },
      {
        heading: "Improved",
        items: ["Your basket is still there after you sign in."],
      },
    ],
  },
  {
    version: "v0.1.0",
    date: "8 Oct 2026",
    cards: [{ number: 60, title: "The first shop: products, basket, checkout" }],
    notes: [
      {
        heading: "New",
        items: ["The first shop: browse products, fill a basket, check out."],
      },
    ],
  },
];

const SAMPLE: Waiting[] = [
  { number: 101, title: "Send a receipt by email after checkout" },
  { number: 99, title: "Fix the basket count when an item sells out" },
  { number: 97, title: "Show delivery dates on the product page" },
];

type Store = { releases: Release[]; taken: number[] };
let store: Store = { releases: PAST, taken: [] };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => store;

function nextVersion(latest: string | undefined): string {
  const parts = (latest ?? "v0.0.0").slice(1).split(".").map(Number);
  return `v${String(parts[0] ?? 0)}.${String((parts[1] ?? 0) + 1)}.0`;
}

// The notes the kobold writes: plain sentences, grouped by what changed.
function notesOf(cards: Waiting[]): Group[] {
  const fixed = cards.filter((card) => /^fix/i.test(card.title));
  const rest = cards.filter((card) => !/^fix/i.test(card.title));
  const plain = (title: string) => {
    const text = title.replace(/^fix\s+/i, "");
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  };
  return [
    { heading: "New", items: rest.map((card) => plain(card.title)) },
    { heading: "Fixed", items: fixed.map((card) => plain(card.title)) },
  ].filter((group) => group.items.length > 0);
}

export function useReleases(done: Waiting[], sample = true) {
  const now = useSyncExternalStore(subscribe, snapshot);
  const [confirming, setConfirming] = useState(false);
  const [writing, setWriting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => {
    clearTimeout(timer.current);
  }, []);
  const base = done.length > 0 || !sample ? done : SAMPLE;
  // Everything merged since the last release: no picking.
  const waiting = base.filter((card) => !now.taken.includes(card.number));
  const version = nextVersion(now.releases[0]?.version);
  // The kobold writes the notes for a moment, then the release appears.
  const make = (name: string) => {
    if (waiting.length === 0) return;
    const cards = waiting;
    setConfirming(false);
    setWriting(true);
    timer.current = setTimeout(() => {
      const release: Release = {
        version: name.trim() || version,
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        cards,
        notes: notesOf(cards),
      };
      store = {
        releases: [release, ...store.releases],
        taken: [...store.taken, ...cards.map((card) => card.number)],
      };
      setWriting(false);
      listeners.forEach((listener) => {
        listener();
      });
    }, 2200);
  };
  return {
    waiting,
    releases: now.releases,
    version,
    writing,
    make,
    confirming,
    ask: () => {
      setConfirming(true);
    },
    cancel: () => {
      setConfirming(false);
    },
  };
}

export function ReleaseNow({
  count,
  onAsk,
}: Readonly<{ count: number; onAsk: () => void }>) {
  return (
    <Button size="pill" disabled={count === 0} onClick={onAsk}>
      <PackageCheck aria-hidden />
      Release now
    </Button>
  );
}

// The step before it is made: the kobold's version number and notes, both
// to edit.
export function ConfirmRelease({
  version,
  count,
  onMake,
  onCancel,
}: Readonly<{
  version: string;
  count: number;
  onMake: (version: string) => void;
  onCancel: () => void;
}>) {
  const [name, setName] = useState(version);
  return (
    <div className="grid gap-2.5 rounded-lg border border-blue/30 bg-card px-3 py-3">
      <p className="text-[13px] leading-snug font-medium">
        The kobold proposes this version: the product as it is on main now,
        with {count} {count === 1 ? "change" : "changes"} since the last one.
      </p>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Version number
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        The kobold writes the release notes itself, after you confirm.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="pill"
          disabled={name.trim() === ""}
          onClick={() => {
            onMake(name);
          }}
        >
          <PackageCheck aria-hidden />
          Release {name.trim() || version}
        </Button>
        <Button variant="ring" size="pill" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function WritingNotes() {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-lg border border-blue/30 bg-card px-3 py-3 text-[13px] text-muted-foreground"
    >
      <LoaderCircle aria-hidden className="size-4 animate-spin text-blue" />
      The kobold is writing the release notes…
    </p>
  );
}

// Merged cards since the last release: read-only, nothing to tick.
export function MergedList({ cards }: Readonly<{ cards: Waiting[] }>) {
  return (
    <ul className="grid gap-1.5">
      {cards.map((card) => (
        <li
          key={card.number}
          className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] leading-snug font-medium [overflow-wrap:anywhere]"
        >
          <span className="text-xs font-normal text-muted-foreground">
            #{card.number}
          </span>{" "}
          {card.title}
        </li>
      ))}
    </ul>
  );
}

// Past releases, newest first; each folds open to its notes and cards.
export function PastReleases({
  releases,
}: Readonly<{ releases: Release[] }>) {
  return (
    <div className="grid gap-1.5">
      {releases.map((release) => (
        <details
          key={release.version}
          open={release === releases[0]}
          className="group rounded-lg border border-border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="size-3.5 flex-none text-muted-foreground transition-transform group-open:rotate-90"
            />
            <Tag aria-hidden className="size-3.5 flex-none text-blue" />
            {release.version}
            <span className="ml-auto text-xs font-normal whitespace-nowrap text-muted-foreground">
              {release.date}
            </span>
          </summary>
          <div className="grid gap-2 border-t border-border px-3 py-2.5">
            {release.notes.map((group) => (
              <div key={group.heading} className="grid gap-1">
                <h4 className="text-xs font-semibold">{group.heading}</h4>
                <ul className="grid gap-1 pl-4 text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                  {group.items.map((item) => (
                    <li key={item} className="list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function MadeUpNote() {
  return (
    <p className="text-[11px] text-faint">
      Prototype: the releases here are made up.
    </p>
  );
}

// Prototype: with no board connected, a made-up one, so the page has cards.
export function madeUpBoard(view: FactoryView): FactoryView {
  if (view.connected) return view;
  const card = (number: number, title: string) => ({
    number,
    title,
    url: "",
    from: null,
    fix: false,
    type: "feature" as never,
    pullRequest: null,
    pullRequestState: null as never,
    conflict: false,
    hint: false,
  });
  const titles: Record<string, [number, string][]> = {
    todo: [[104, "Let customers save a basket for later"]],
    building: [[103, "Show stock left on the product page"]],
    review: [[102, "Add gift wrapping at checkout"]],
    done: SAMPLE.map((one) => [one.number, one.title]),
  };
  return {
    ...view,
    connected: true,
    read: "made-up",
    columns: (["todo", "building", "review", "done"] as const).map((id) => ({
      id,
      title: id,
      cards: (titles[id] ?? []).map(([n, t]) => card(n, t)),
    })),
  };
}
