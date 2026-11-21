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
  // Why this number: new things raise the middle one, only fixes the last.
  why: string;
  date: string;
  cards: Waiting[];
  notes: Group[];
};
type Group = { heading: string; items: string[] };

// Made up, and said so where they show.
function rel(
  version: string,
  date: string,
  why: string,
  cards: Waiting[],
): Release {
  return { version, why, date, cards, notes: notesOf(cards) };
}

const PAST: Release[] = [
  rel("1.4.2", "17 Nov 2026", "Changes people can take as they are", [
    { number: 91, title: "Fix the delivery date shown on small screens" },
    { number: 90, title: "Show the order's status on the confirmation page" },
  ]),
  rel("1.4.1", "12 Nov 2026", "Changes people can take as they are", [
    { number: 88, title: "Fix the total when a voucher and a discount meet" },
  ]),
  rel(
    "1.4.0",
    "5 Nov 2026",
    "Something people relied on changed: the basket now empties after 30 days",
    [
      { number: 85, title: "Empty a basket after 30 days without a visit" },
      { number: 84, title: "Let customers change their delivery address" },
    ],
  ),
  rel("1.3.2", "29 Oct 2026", "Changes people can take as they are", [
    { number: 76, title: "Fix the search when a name has a capital letter" },
  ]),
  rel("1.3.1", "22 Oct 2026", "Changes people can take as they are", [
    { number: 74, title: "Search the shop by product name" },
    { number: 71, title: "Remember the basket after signing in" },
  ]),
  rel(
    "1.3.0",
    "8 Oct 2026",
    "Something people relied on changed: sign-in now needs an email, not a username",
    [{ number: 60, title: "Sign in with an email instead of a username" }],
  ),
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

// Whether version a is higher than b (1.4.3 is higher than 1.4.2).
export function isHigher(a: string, b: string): boolean {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let at = 0; at < 3; at++) {
    const d = (x[at] ?? 0) - (y[at] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

function isFix(card: Waiting): boolean {
  return /^fix/i.test(card.title);
}

// What people relied on changes or goes away, or they have to do something.
function breaks(card: Waiting): boolean {
  return /\b(remov\w*|no longer|replac\w*|renam\w*|instead of|must|now needs?)\b/i.test(
    card.title,
  );
}

// The rule: most releases raise only the last number (1.4.2 to 1.4.3), fixes
// and new things alike; the middle one goes up (1.4.3 to 1.5.0) only when
// something people relied on changes or goes away.
export function nextVersion(
  latest: string | undefined,
  cards: Waiting[],
): { version: string; why: string } {
  const [major = 0, minor = 0, patch = 0] = (latest ?? "0.0.0")
    .split(".")
    .map(Number);
  const change = cards.find(breaks);
  if (change)
    return {
      version: `${String(major)}.${String(minor + 1)}.0`,
      why: `Something people relied on changes: ${change.title.charAt(0).toLowerCase()}${change.title.slice(1)}`,
    };
  return {
    version: `${String(major)}.${String(minor)}.${String(patch + 1)}`,
    why: "Changes people can take as they are",
  };
}

// The notes the kobold writes: plain sentences, grouped by what changed.
function notesOf(cards: Waiting[]): Group[] {
  const fixed = cards.filter(isFix);
  const rest = cards.filter((card) => !isFix(card));
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
  const { version, why } = nextVersion(now.releases[0]?.version, waiting);
  // The kobold writes the notes for a moment, then the release appears.
  const make = (name: string) => {
    if (waiting.length === 0) return;
    const cards = waiting;
    setConfirming(false);
    setWriting(true);
    timer.current = setTimeout(() => {
      const release: Release = {
        version: name.trim() || version,
        why,
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
    last: now.releases[0]?.version,
    why,
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
  label = "Release now",
}: Readonly<{ count: number; onAsk: () => void; label?: string }>) {
  return (
    <Button size="pill" disabled={count === 0} onClick={onAsk}>
      <PackageCheck aria-hidden />
      {label}
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
            <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
              {release.why}
            </span>
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
