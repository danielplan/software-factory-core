// Prototype: Home as blocks. Each add-on offers blocks (waiting, the loop,
// a failed check); the team arranges them (variant A) or tells the kobold
// what it wants (variant B). The layout is kept on this computer.

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Send,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import { FIELD } from "@/lib/field-style";
import { VARIANT } from "@/lib/prototype-flags";

export type BlockId = "status" | "waiting" | "loop" | "reviews" | "failed";

type BlockInfo = { id: BlockId; name: string; from: string; about: string };

export const BLOCKS: BlockInfo[] = [
  {
    id: "status",
    name: "Product status",
    from: "Core",
    about: "How the product is doing, in a line",
  },
  {
    id: "waiting",
    name: "Waiting for you",
    from: "Core",
    about: "Everything that waits for you",
  },
  {
    id: "loop",
    name: "The loop",
    from: "Core",
    about: "From signals to done",
  },
  {
    id: "reviews",
    name: "Open reviews",
    from: "GitHub board",
    about: "Pull requests waiting for your review",
  },
  {
    id: "failed",
    name: "Failed check",
    from: "Checks",
    about: "Checks that failed on a pull request",
  },
];

const fromOf = (id: BlockId) =>
  BLOCKS.find((b) => b.id === id)?.from ?? "Core";

const nameOf = (id: BlockId) => BLOCKS.find((b) => b.id === id)?.name ?? id;

type Layout = { order: BlockId[]; hidden: BlockId[] };

const DEFAULT: Layout = {
  order: ["status", "waiting", "loop", "reviews", "failed"],
  hidden: ["reviews", "failed"],
};

const STORE = "kobble.home-layout";

function load(): Layout {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as Layout;
  } catch {
    // fall through to the default
  }
  return DEFAULT;
}

function useLayout() {
  const [layout, set] = useState<Layout>(load);
  const change = (next: Layout) => {
    localStorage.setItem(STORE, JSON.stringify(next));
    set(next);
  };
  return [layout, change] as const;
}

const visibleOf = (l: Layout) => l.order.filter((id) => !l.hidden.includes(id));

function moveBefore(order: BlockId[], id: BlockId, target: BlockId) {
  if (id === target) return order;
  const rest = order.filter((x) => x !== id);
  rest.splice(rest.indexOf(target), 0, id);
  return rest;
}

function nudge(l: Layout, id: BlockId, by: -1 | 1): Layout {
  const shown = visibleOf(l);
  const next = shown[shown.indexOf(id) + by];
  if (!next) return l;
  const order = [...l.order];
  const a = order.indexOf(id);
  const b = order.indexOf(next);
  order[a] = next;
  order[b] = id;
  return { ...l, order };
}

const button =
  "inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs hover:bg-hover";

export function HomeBlocks({
  blocks,
}: Readonly<{ blocks: Record<BlockId, ReactNode> }>) {
  const [layout, change] = useLayout();
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<BlockId | null>(null);
  const [over, setOver] = useState<BlockId | null>(null);
  const shown = visibleOf(layout);
  const arranging = VARIANT === "A" && editing;
  return (
    <>
      {VARIANT === "A" ? (
        <div className="flex items-center justify-end gap-2">
          {editing && (
            <button
              type="button"
              className={button}
              onClick={() => change(DEFAULT)}
            >
              Start again
            </button>
          )}
          <button
            type="button"
            className={button}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : "Arrange Home"}
          </button>
        </div>
      ) : (
        <AskKobold layout={layout} change={change} />
      )}
      {shown.map((id, at) => (
        <div
          key={id}
          draggable={arranging}
          onDragStart={() => setDragging(id)}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onDragOver={(e) => {
            if (!arranging || !dragging) return;
            e.preventDefault();
            setOver(id);
          }}
          onDrop={() => {
            if (dragging)
              change({
                ...layout,
                order: moveBefore(layout.order, dragging, id),
              });
            setDragging(null);
            setOver(null);
          }}
          className={
            "grid gap-2" +
            (arranging
              ? " rounded-xl border border-dashed border-border p-2 [&_[data-block-title]]:hidden" +
                (over === id && dragging !== id ? " bg-surface" : "") +
                (dragging === id ? " opacity-50" : "")
              : "")
          }
        >
          {arranging && (
            <div className="flex items-center gap-2 text-xs">
              <GripVertical
                aria-hidden
                className="size-4 cursor-grab text-muted-foreground"
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {nameOf(id)}
                {fromOf(id) !== "Core" && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {fromOf(id)}
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label="Move up"
                disabled={at === 0}
                className={button + " disabled:opacity-40"}
                onClick={() => change(nudge(layout, id, -1))}
              >
                <ArrowUp aria-hidden className="size-3" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={at === shown.length - 1}
                className={button + " disabled:opacity-40"}
                onClick={() => change(nudge(layout, id, 1))}
              >
                <ArrowDown aria-hidden className="size-3" />
              </button>
              <button
                type="button"
                className={button}
                onClick={() =>
                  change({ ...layout, hidden: [...layout.hidden, id] })
                }
              >
                <X aria-hidden className="size-3" />
                Hide
              </button>
            </div>
          )}
          {blocks[id]}
        </div>
      ))}
      {arranging && <Offers layout={layout} change={change} />}
    </>
  );
}

// What the add-ons offer and Home does not show yet, by add-on.
function Offers({
  layout,
  change,
}: Readonly<{ layout: Layout; change: (l: Layout) => void }>) {
  const offered = BLOCKS.filter((b) => layout.hidden.includes(b.id));
  const from = [...new Set(offered.map((b) => b.from))];
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-3.5">
      <span className="text-[13px] font-medium">Blocks you can add</span>
      {offered.length === 0 && (
        <span className="text-xs text-muted-foreground">
          Every block the add-ons offer is on Home.
        </span>
      )}
      {from.map((name) => (
        <div key={name} className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">{name}</span>
          {offered
            .filter((b) => b.from === name)
            .map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{b.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.about}
                  </span>
                </span>
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    change({
                      ...layout,
                      hidden: layout.hidden.filter((x) => x !== b.id),
                    })
                  }
                >
                  <Plus aria-hidden className="size-3" />
                  Add
                </button>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

// ---- Variant B: the kobold rearranges Home from the team's words ----

const WORDS: [BlockId, RegExp][] = [
  ["reviews", /review|pull request|\bpr/i],
  ["failed", /fail|check|red\b|broken/i],
  ["waiting", /wait|for me|todo|to do/i],
  ["loop", /loop|pipeline|stages?|flow/i],
  ["status", /status|health|product|running/i],
];

// One clause of what was said: which block, and what to do with it.
function applyClause(l: Layout, clause: string): [Layout, string] | null {
  const id = WORDS.find(([, re]) => re.test(clause))?.[0];
  if (!id) return null;
  const name = nameOf(id);
  const has = (re: RegExp) => re.test(clause);
  if (has(/hide|remove|drop|without|get rid|don'?t show|no more/i)) {
    if (l.hidden.includes(id)) return [l, `${name} was hidden already.`];
    return [
      { ...l, hidden: [...l.hidden, id] },
      `${name} is hidden. Ask me to bring it back any time.`,
    ];
  }
  const shownAgain = { ...l, hidden: l.hidden.filter((x) => x !== id) };
  if (has(/first|top|start|before/i))
    return [
      { ...shownAgain, order: [id, ...l.order.filter((x) => x !== id)] },
      `${name} is first on Home now.`,
    ];
  if (has(/last|bottom|end|after/i))
    return [
      { ...shownAgain, order: [...l.order.filter((x) => x !== id), id] },
      `${name} is at the bottom of Home now.`,
    ];
  if (!l.hidden.includes(id)) return [l, `${name} is on Home already.`];
  return [shownAgain, `${name} is on Home now.`];
}

const SUGGESTIONS = [
  "Show me open reviews first",
  "Add the failed check",
  "Hide the loop",
];

function AskKobold({
  layout,
  change,
}: Readonly<{ layout: Layout; change: (l: Layout) => void }>) {
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [said, setSaid] = useState<{ line: string; undo: Layout | null } | null>(
    null,
  );
  const ask = (words: string) => {
    if (!words.trim() || thinking) return;
    setText("");
    setThinking(true);
    setTimeout(() => {
      let next = layout;
      const lines: string[] = [];
      for (const clause of words.split(/,| and | then |\./i)) {
        if (!clause.trim()) continue;
        const done = applyClause(next, clause);
        if (done) {
          next = done[0];
          lines.push(done[1]);
        }
      }
      setThinking(false);
      if (lines.length === 0) {
        setSaid({
          line: "I could not tell which block you mean. I can move, show or hide Product status, Waiting for you, The loop, Open reviews and Failed check.",
          undo: null,
        });
        return;
      }
      change(next);
      setSaid({
        line: lines.join(" "),
        undo: next === layout ? null : layout,
      });
    }, 700);
  };
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-soft">
      <form
        className="flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <KoboldHead size={28} />
        <input
          className={FIELD}
          value={text}
          placeholder="Tell the kobold how Home should look"
          aria-label="Tell the kobold how Home should look"
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className={button + " h-8"}
          disabled={thinking || !text.trim()}
        >
          <Send aria-hidden className="size-3" />
          Send
        </button>
      </form>
      {(thinking || said) && (
        <p className="pl-[38px] text-[13px] text-foreground-2">
          {thinking ? "Thinking…" : said?.line}{" "}
          {!thinking && said?.undo && (
            <button
              type="button"
              className="font-medium text-blue hover:underline"
              onClick={() => {
                if (said.undo) change(said.undo);
                setSaid({ line: "Back as it was.", undo: null });
              }}
            >
              Undo
            </button>
          )}
        </p>
      )}
      {!said && !thinking && (
        <div className="flex flex-wrap gap-1.5 pl-[38px]">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={button}
              onClick={() => ask(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
