// Prototype: Home as blocks. Each extension offers blocks (waiting, the
// loop, a failed check); the team drags, hides and adds them. The layout is
// kept in the factory's files, one Home for the team.

import {
  ArrowDown,
  ArrowUp,
  Check,
  Columns3,
  FlaskConical,
  Inbox,
  GripVertical,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { get, onKobbleChanged, post } from "@/api";

import { IconTile } from "@/add-ons/looks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type BlockId =
  | "status"
  | "waiting"
  | "loop"
  | "exploring"
  | "signals"
  | "reviews"
  | "failed";

// `ext` is the extension that brings the block.
type BlockInfo = {
  id: BlockId;
  name: string;
  from: string;
  ext: string;
  about: string;
};

// The blocks the extensions offer, by the extension that offers them.
export const BLOCKS: BlockInfo[] = [
  {
    id: "status",
    name: "Product status",
    from: "Factory",
    ext: "factory",
    about: "How the product is doing, in a line",
  },
  {
    id: "waiting",
    name: "Waiting for you",
    from: "Factory",
    ext: "factory",
    about: "Everything that waits for you, with a button for each",
  },
  {
    id: "loop",
    name: "The loop",
    from: "Factory",
    ext: "factory",
    about: "From what came in to what is done, in four stages",
  },
  {
    id: "exploring",
    name: "Being explored",
    from: "Explorations",
    ext: "explorations",
    about: "The ideas the team is exploring, and what is next for each",
  },
  {
    id: "signals",
    name: "New signals",
    from: "Signals",
    ext: "signals",
    about: "What the live app reported since you last looked",
  },
  {
    id: "reviews",
    name: "Open reviews",
    from: "Factory",
    ext: "factory",
    about: "The Factory's cards in review, on whichever board they live",
  },
  {
    id: "failed",
    name: "Failed check",
    from: "Verification",
    ext: "verification",
    about: "Checks that failed on a pull request",
  },
];

const fromOf = (id: BlockId) =>
  BLOCKS.find((b) => b.id === id)?.from ?? "Factory";

const nameOf = (id: BlockId) => BLOCKS.find((b) => b.id === id)?.name ?? id;

type Layout = { order: BlockId[]; hidden: BlockId[] };

const DEFAULT: Layout = {
  order: [
    "status",
    "waiting",
    "loop",
    "exploring",
    "signals",
    "reviews",
    "failed",
  ],
  hidden: ["exploring", "signals", "reviews", "failed"],
};

// A layout kept before a block existed gets it, hidden, at the end.
function whole(layout: Layout): Layout {
  const missing = DEFAULT.order.filter((id) => !layout.order.includes(id));
  return {
    order: [...layout.order, ...missing],
    hidden: [...layout.hidden, ...missing],
  };
}

// One Home for the whole team: kept in the factory's files, read again when
// it changes (the page's stream) and every few seconds.
function useLayout() {
  const [layout, set] = useState<Layout>(DEFAULT);
  useEffect(() => {
    let current = true;
    const load = () => {
      get<{ layout: Layout | null }>("/api/home-layout").then(
        (read) => {
          if (current) set(read.layout ? whole(read.layout) : DEFAULT);
        },
        () => undefined,
      );
    };
    load();
    const stop = onKobbleChanged(load);
    const again = setInterval(load, 3000);
    return () => {
      current = false;
      stop();
      clearInterval(again);
    };
  }, []);
  const change = (next: Layout) => {
    set(next);
    post("/api/home-layout", next).catch(() => undefined);
  };
  return [layout, change] as const;
}

// Blocks of an extension that is not installed are not offered (null: all are).
type Installed = Set<string> | null;

const offeredOf = (id: BlockId, installed: Installed) =>
  !installed || installed.has(BLOCKS.find((b) => b.id === id)?.ext ?? "");

const visibleOf = (l: Layout, installed: Installed) =>
  l.order.filter((id) => !l.hidden.includes(id) && offeredOf(id, installed));

function moveBefore(order: BlockId[], id: BlockId, target: BlockId) {
  if (id === target) return order;
  const rest = order.filter((x) => x !== id);
  rest.splice(rest.indexOf(target), 0, id);
  return rest;
}

function nudge(
  l: Layout,
  id: BlockId,
  by: -1 | 1,
  installed: Installed,
): Layout {
  const shown = visibleOf(l, installed);
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

// Arrange Home, at the right of the page's title; Done while arranging.
export function ArrangeButton({
  editing,
  onClick,
}: Readonly<{ editing: boolean; onClick: () => void }>) {
  return (
    <Button variant="ring" size="pill" onClick={onClick}>
      {editing ? (
        <Check aria-hidden />
      ) : (
        <LayoutGrid aria-hidden />
      )}
      {editing ? "Done" : "Arrange Home"}
    </Button>
  );
}

export function HomeBlocks({
  blocks,
  editing,
  installed,
}: Readonly<{
  blocks: Record<BlockId, ReactNode>;
  editing: boolean;
  installed: Installed;
}>) {
  const [layout, change] = useLayout();
  const [dragging, setDragging] = useState<BlockId | null>(null);
  const [over, setOver] = useState<BlockId | null>(null);
  const shown = visibleOf(layout, installed);
  const arranging = editing;
  return (
    <>
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
                {(
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
                onClick={() => change(nudge(layout, id, -1, installed))}
              >
                <ArrowUp aria-hidden className="size-3" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={at === shown.length - 1}
                className={button + " disabled:opacity-40"}
                onClick={() => change(nudge(layout, id, 1, installed))}
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
      {arranging && (
        <div className="flex items-center justify-between gap-2">
          <AddBlock layout={layout} change={change} installed={installed} />
          <button
            type="button"
            className={button}
            onClick={() => {
              change(DEFAULT);
            }}
          >
            Start again
          </button>
        </div>
      )}
    </>
  );
}

// What a block looks like, drawn small.
function Bar({ w, dark = false }: Readonly<{ w: string; dark?: boolean }>) {
  return (
    <span
      className={"block h-1.5 rounded-full " + (dark ? "bg-foreground/35" : "bg-foreground/15")}
      style={{ width: w }}
    />
  );
}

function Rows({ n, tag }: Readonly<{ n: number; tag: string }>) {
  return (
    <>
      {Array.from({ length: n }, (_, at) => (
        <div
          key={at}
          className="flex items-center gap-2 border-t border-border-soft px-2 py-1.5 first:border-t-0"
        >
          <span className={"h-1.5 w-6 rounded-full " + tag} />
          <span className="grid flex-1 gap-1">
            <Bar w={at % 2 ? "70%" : "85%"} dark />
            <Bar w="50%" />
          </span>
          <span className="h-3.5 w-8 rounded border border-border" />
        </div>
      ))}
    </>
  );
}

function Preview({ id }: Readonly<{ id: BlockId }>) {
  const frame = "overflow-hidden rounded-lg border border-border bg-card";
  switch (id) {
    case "status":
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="size-2 rounded-full bg-foreground/25" />
          <Bar w="60%" dark />
          <span className="ml-auto h-1.5 w-8 rounded-full bg-blue/50" />
        </div>
      );
    case "waiting":
      return (
        <div className={frame}>
          <Rows n={3} tag="bg-explore/60" />
        </div>
      );
    case "loop":
      return (
        <div className={frame + " grid grid-cols-4"}>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="grid gap-1 border-l border-border-soft p-2 first:border-l-0">
              <Bar w="60%" dark />
              <span className="h-3 w-4 rounded bg-foreground/30" />
              <Bar w="80%" />
            </div>
          ))}
        </div>
      );
    case "exploring":
      return (
        <div className={frame}>
          <Rows n={2} tag="bg-explore/60" />
        </div>
      );
    case "signals":
      return (
        <div className={frame}>
          <Rows n={2} tag="bg-understand/60" />
        </div>
      );
    case "reviews":
      return (
        <div className={frame}>
          <Rows n={2} tag="bg-build/60" />
        </div>
      );
    case "failed":
      return (
        <div className={frame + " flex items-center gap-2 p-2"}>
          <span className="size-2 rounded-full bg-destructive/70" />
          <span className="grid flex-1 gap-1">
            <Bar w="55%" dark />
            <Bar w="80%" />
          </span>
          <span className="h-3.5 w-8 rounded border border-border" />
        </div>
      );
  }
}

// An extension that offers blocks, with its icon.
function ExtIcon({ name }: Readonly<{ name: string }>) {
  const look: Record<string, { icon: ReactNode; color: string }> = {
    Factory: { icon: <Columns3 aria-hidden />, color: "var(--build)" },
    Explorations: { icon: <FlaskConical aria-hidden />, color: "var(--explore)" },
    Signals: { icon: <Inbox aria-hidden />, color: "var(--understand)" },
  };
  const own = look[name];
  if (!own)
    return <IconTile id={name === "GitHub board" ? "github" : "checks"} />;
  return (
    <span
      aria-hidden
      className="grid size-8 flex-none place-items-center rounded-lg [&_svg]:size-4"
      style={{
        color: own.color,
        backgroundColor: `color-mix(in oklab, ${own.color} 13%, transparent)`,
      }}
    >
      {own.icon}
    </span>
  );
}

// Add a block: the extensions that offer Home blocks at the left, the
// blocks of the one picked at the right, each with a small preview.
function AddBlock({
  layout,
  change,
  installed,
}: Readonly<{
  layout: Layout;
  change: (l: Layout) => void;
  installed: Installed;
}>) {
  const offered = BLOCKS.filter((b) => offeredOf(b.id, installed));
  const from = [...new Set(offered.map((b) => b.from))];
  const [chosen, setPicked] = useState(from[0] ?? "");
  const picked = from.includes(chosen) ? chosen : (from[0] ?? "");
  const mine = offered.filter((b) => b.from === picked);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ring" size="pill">
          <Plus aria-hidden />
          Add a block
        </Button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogTitle className="px-5 pt-4 pb-3 text-[15px] font-semibold">
          Add a block to Home
        </DialogTitle>
        <div className="grid min-h-[360px] grid-cols-[210px_minmax(0,1fr)] border-t border-border-soft">
          <nav
            aria-label="Extensions that offer blocks"
            className="grid content-start gap-0.5 border-r border-border-soft p-2"
          >
            {from.map((name) => (
              <button
                key={name}
                type="button"
                aria-current={name === picked ? "true" : undefined}
                onClick={() => {
                  setPicked(name);
                }}
                className={
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-hover " +
                  (name === picked ? "bg-hover font-medium" : "")
                }
              >
                <ExtIcon name={name} />
                <span className="min-w-0 truncate">{name}</span>
              </button>
            ))}
          </nav>
          <div className="grid max-h-[60vh] content-start gap-3 overflow-y-auto p-4">
            {mine.map((b) => {
              const on = !layout.hidden.includes(b.id);
              return (
                <div
                  key={b.id}
                  className="grid gap-2.5 rounded-xl border border-border p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{b.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {b.about}
                      </span>
                    </span>
                    {on ? (
                      <span className="inline-flex h-7 items-center gap-1 text-xs text-muted-foreground">
                        <Check aria-hidden className="size-3" />
                        On Home
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={button}
                        onClick={() => {
                          change({
                            ...layout,
                            hidden: layout.hidden.filter((x) => x !== b.id),
                          });
                        }}
                      >
                        <Plus aria-hidden className="size-3" />
                        Add
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg bg-surface p-2.5" aria-hidden>
                    <Preview id={b.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
