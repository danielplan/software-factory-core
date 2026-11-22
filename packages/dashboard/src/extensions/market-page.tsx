// The marketplace, a page of its own. A search field and filters, the
// extensions as cards in a grid; a click opens one's details. Installing one
// that needs another asks first and installs both; removing one that others
// need is refused, with why. Where GitHub and Jira belong differs by variant:
// A, a setting in Factory's details; B, a Connections tab; C, a group here.

import {
  Check,
  Download,
  Package,
  Plug,
  Puzzle,
  Search,
  Users,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FactoryState } from "@/dashboard/dashboard";
import { GroupForm } from "@/dashboard/settings-card";
import { FIELD } from "@/lib/field-style";
import { VARIANT } from "@/lib/prototype-flags";
import { useFlip } from "@/lib/use-flip";
import { cn } from "@/lib/utils";

import { Adds, Logo, Maker, Needs } from "./bits";
import { type Ext, KITS, missingFor, neededBy, useExtensions } from "./data";

const TABS = [
  { name: "Extensions", icon: <Puzzle aria-hidden /> },
  { name: "Connections", icon: <Plug aria-hidden /> },
  { name: "Product kits", icon: <Package aria-hidden /> },
] as const;

const FILTERS = ["All", "Installed", "Kobble's", "Your team's"] as const;
type Filter = (typeof FILTERS)[number];

const fits = (e: Ext, filter: Filter) =>
  filter === "All" ||
  (filter === "Installed" && e.on) ||
  (filter === "Kobble's" && e.maker === "kobble") ||
  (filter === "Your team's" && e.maker === "team");

export function MarketPage({ state }: Readonly<{ state: FactoryState }>) {
  const { all, turn, moveCards, problem } = useExtensions(state);
  const [tab, setTab] = useState<"Extensions" | "Connections" | "Product kits">("Extensions");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  // Calm motion: the one just installed, the one on its way out, the tab
  // marker, and things sliding into their new place.
  const [fresh, setFresh] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(
    null,
  );
  const page = useRef<HTMLDivElement>(null);
  useFlip(page);
  useLayoutEffect(() => {
    const at = tabs.current[tab];
    if (at) setMarker({ left: at.offsetLeft, width: at.offsetWidth });
  }, [tab]);
  const [openId, setOpenId] = useState<string | null>(null);
  // Installing one that needs others not installed yet: asks first.
  const [asking, setAsking] = useState<{ ext: Ext; also: Ext[] } | null>(null);
  // Switching where the cards live: asks first.
  const [moving, setMoving] = useState<{ from: Ext; to: Ext } | null>(null);
  const matches = all.filter(
    (e) =>
      fits(e, filter) &&
      `${e.name} ${e.about}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // A and B keep the boards out of the list of extensions.
  const shown = matches.filter((e) => !e.tracker);
  const trackers = all.filter((e) => e.tracker);
  const trackerShown =
    VARIANT === "C" &&
    filter !== "Your team's" &&
    (filter !== "Installed" || trackers.some((e) => e.on)) &&
    trackers.some((e) => matches.includes(e));
  const opened =
    all.find((e) => e.id === openId) ??
    KITS.find((e) => e.id === openId) ??
    null;
  // The code host: GitHub itself, always needed, connected, no switch.
  const github = trackers.find((e) => e.id === "github");
  const codeHost: Ext | null = github
    ? {
        ...github,
        name: "GitHub",
        about: "Your code and its pull requests, through the GitHub CLI.",
        on: true,
      }
    : null;
  const justInstalled = (id: string) => {
    setFresh(id);
    setTimeout(() => {
      setFresh(null);
    }, 900);
  };
  const install = (ext: Ext) => {
    const also = missingFor(ext, all);
    if (also.length > 0) setAsking({ ext, also });
    else {
      turn(ext.id, true);
      justInstalled(ext.id);
    }
  };
  return (
    <div ref={page} className="grid gap-5">
      <PageHead
        title={VARIANT === "B" ? "Marketplace" : "Extensions"}
        about={
          VARIANT === "B"
            ? "What your factory can do, and the services it works with."
            : "What your factory can do. Install what you need; the kobold can write your own."
        }
      />
      {VARIANT === "B" && (
        <div
          role="tablist"
          aria-label="Marketplace"
          className="relative inline-flex w-fit gap-1 rounded-xl bg-surface-2 p-1"
        >
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-lg bg-card shadow-current transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
            style={marker ? { left: marker.left, width: marker.width } : { display: "none" }}
          />
          {TABS.map(({ name, icon }) => (
            <button
              key={name}
              ref={(el) => {
                tabs.current[name] = el;
              }}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => {
                setTab(name);
              }}
              className={cn(
                "relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200 [&_svg]:size-3.5",
                tab === name
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {icon}
              {name}
            </button>
          ))}
        </div>
      )}
      {VARIANT === "B" && tab === "Connections" ? (
        <div className="grid gap-8">
          <Group title="Your code" about="Branches and pull requests. Pick one.">
            {codeHost && (
              <Card
                ext={codeHost}
                label="In use"
                note="Branches and pull requests"
                onOpen={() => {
                  setOpenId("github");
                }}
                action={null}
              />
            )}
          </Group>
          <TrackerGroup
            title="Your tasks"
            about="Where the Factory's cards are kept. Pick one."
            trackers={trackers}
            onOpen={setOpenId}
            onMove={(from, to) => {
              setMoving({ from, to });
            }}
          />
        </div>
      ) : VARIANT === "B" && tab === "Product kits" ? (
        <KitsTab onOpen={setOpenId} />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className={cn(FIELD, "pl-8")}
            value={query}
            placeholder="Search extensions"
            aria-label="Search extensions"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </label>
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filter === name}
              onClick={() => {
                setFilter(name);
              }}
              className={cn(
                "h-8 rounded-lg border px-3 text-[13px]",
                filter === name
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-hover",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
      {trackerShown && (
        <TrackerGroup
          title="Where your cards live"
          about="Pick one: the Factory works the cards there."
          trackers={trackers}
          onOpen={setOpenId}
          onMove={(from, to) => {
            setMoving({ from, to });
          }}
        />
      )}
      {shown.length === 0 && !trackerShown ? (
        <p className="px-1 py-8 text-center text-[13px] text-muted-foreground">
          No extension matches. Try other words, or ask Sprocket for one of your own.
        </p>
      ) : (
        (["Installed", "Available"] as const).map((title) => {
          const list = shown.filter((e) => e.on === (title === "Installed"));
          if (list.length === 0) return null;
          return (
            <section key={title} aria-label={title} className="grid gap-3">
              <h2 className="flex items-center gap-2 px-1 text-[15px] font-semibold">
                {title}
                <span className="text-[12.5px] font-normal text-muted-foreground">
                  {list.length}
                </span>
              </h2>
              <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((ext) => (
                  <Card
                    key={ext.id}
                    ext={ext}
                    note={
                      VARIANT === "A" && ext.id === "factory"
                        ? `Add-on: ${trackers.find((t) => t.on)?.name ?? "none yet"}`
                        : undefined
                    }
                    fresh={fresh === ext.id}
                    leaving={leaving === ext.id}
                    onOpen={() => {
                      setOpenId(ext.id);
                    }}
                    action={
                      ext.on ? null : (
                        <InstallButton
                          ext={ext}
                          onInstall={() => {
                            install(ext);
                          }}
                        />
                      )
                    }
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
        </>
      )}
      <DetailsOf
        ext={opened}
        all={all}
        state={state}
        onClose={() => {
          setOpenId(null);
        }}
        onInstall={install}
        onMove={(from, to) => {
          setOpenId(null);
          setMoving({ from, to });
        }}
        onConnections={() => {
          setOpenId(null);
          setTab("Connections");
        }}
        onOpen={setOpenId}
        onRemove={(e) => {
          // The card fades out first; the rest close up as it goes.
          setOpenId(null);
          setLeaving(e.id);
          setTimeout(() => {
            turn(e.id, false);
            setLeaving(null);
          }, 200);
        }}
      />
      <Dialog
        open={moving !== null}
        onOpenChange={(open) => {
          if (!open) setMoving(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogTitle>
            {moving?.from
              ? `Move from ${moving.from.name} to ${moving.to.name}?`
              : `Connect ${moving?.to.name ?? ""}?`}
          </DialogTitle>
          <DialogDescription>
            {moving?.from
              ? "Your cards stay where they are."
              : "The Factory works the cards there."}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="ring"
              size="pill"
              onClick={() => {
                setMoving(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="pill"
              onClick={() => {
                if (moving) moveCards(moving.to.id);
                setMoving(null);
              }}
            >
              {moving?.from ? "Move" : "Connect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={asking !== null}
        onOpenChange={(open) => {
          if (!open) setAsking(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogTitle>Install both?</DialogTitle>
          <DialogDescription>
            {asking &&
              `${asking.ext.name} needs ${asking.also.map((e) => e.name).join(" and ")}, which ${asking.also.length === 1 ? "is" : "are"} not installed yet. They are installed together.`}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="ring"
              size="pill"
              onClick={() => {
                setAsking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="pill"
              onClick={() => {
                if (asking)
                  for (const e of [...asking.also, asking.ext]) {
                    turn(e.id, true);
                    justInstalled(e.id);
                  }
                setAsking(null);
              }}
            >
              Install{" "}
              {asking ? [...asking.also, asking.ext].map((e) => e.name).join(" and ") : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({
  ext,
  onOpen,
  action,
  note,
  usedBy,
  badge,
  fresh = false,
  leaving = false,
  label = "Installed",
}: Readonly<{
  ext: Ext;
  onOpen: () => void;
  // Just installed: it turns green and its check pops in.
  fresh?: boolean;
  // Being removed: it fades out.
  leaving?: boolean;
  // A small line under the one-liner.
  note?: string;
  // The products that use it (a kit), as chips in the card's foot.
  usedBy?: string[];
  // A small muted badge beside the name.
  badge?: string;
  // What to press; none once it is in.
  action: React.ReactNode;
  label?: "Installed" | "In use" | "Connected" | "Pre-installed";
}>) {
  // GitHub as the code host and GitHub as the board are two cards.
  const flipId = ext.name === "GitHub" ? "github-code" : ext.id;
  return (
    <article
      aria-label={ext.name}
      data-flip={flipId}
      className={cn(
        "relative grid content-between gap-3.5 rounded-xl p-4 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        fresh ? "m-tint" : "m-rise",
        leaving && "m-leave",
        ext.on
          ? "bg-success/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--success)_22%,transparent)]"
          : "bg-card shadow-soft",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${ext.name}`}
        className="absolute inset-0 rounded-xl"
      />
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <Logo ext={ext} />
          <div className="grid min-w-0 gap-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{ext.name}</span>
              {badge && (
                <span className="whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                  {badge}
                </span>
              )}
            </span>
            {ext.maker === "team" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users aria-hidden className="size-3" />
                Made by your team
              </span>
            )}
          </div>
          {ext.on && (
            <span
              data-flip={
                label === "In use"
                  ? `inuse-${flipId === "github-code" ? "code" : "cards"}`
                  : undefined
              }
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-success"
            >
              {label !== "Installed" && label}
              <span
                role="img"
                aria-label={label}
                className={cn(
                  "grid size-5 flex-none place-items-center rounded-full bg-success text-white",
                  fresh && "m-pop",
                )}
              >
                <Check aria-hidden className="size-3" strokeWidth={3} />
              </span>
            </span>
          )}
        </div>
        <p className="text-[13px] text-foreground/75">{ext.about}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {(action || (usedBy && usedBy.length > 0)) && (
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          {usedBy && usedBy.length > 0 ? <UsedBy products={usedBy} /> : <span />}
          {action}
        </div>
      )}
    </article>
  );
}

const SHORT: Record<string, string> = { github: "GitHub", jira: "Jira" };

// What to press on a board: Connect while none is connected, otherwise the
// way over to this one; the one in use has nothing to press.
function TrackerAction({
  ext,
  trackers,
  onMove,
}: Readonly<{
  ext: Ext;
  trackers: Ext[];
  onMove: (from: Ext, to: Ext) => void;
}>) {
  if (ext.on) return null;
  const now = trackers.find((e) => e.on);
  if (!now)
    return (
      <Button asChild size="pill">
        <a href="#settings/connections">Connect</a>
      </Button>
    );
  return (
    <Button
      variant="ring"
      size="pill"
      onClick={() => {
        onMove(now, ext);
      }}
    >
      Switch to {SHORT[ext.id] ?? ext.name}
    </Button>
  );
}

// A group of services that do one job, with its title and line.
function Group({
  title,
  about,
  children,
}: Readonly<{ title: string; about: string; children: React.ReactNode }>) {
  return (
    <section aria-label={title} className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{about}</p>
      </div>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// The boards the Factory can work the cards on: pick one.
function TrackerGroup({
  title,
  about,
  trackers,
  onOpen,
  onMove,
}: Readonly<{
  title: string;
  about: string;
  trackers: Ext[];
  onOpen: (id: string) => void;
  onMove: (from: Ext, to: Ext) => void;
}>) {
  return (
    <section aria-label={title} className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{about}</p>
      </div>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2">
        {trackers.map((ext) => (
          <Card
            key={ext.id}
            ext={ext}
            label="In use"
            onOpen={() => {
              onOpen(ext.id);
            }}
            action={<TrackerAction ext={ext} trackers={trackers} onMove={onMove} />}
          />
        ))}
      </div>
    </section>
  );
}

function InstallButton({
  ext,
  onInstall,
}: Readonly<{ ext: Ext; onInstall: () => void }>) {
  if (ext.on)
    return (
      <span className="inline-flex h-8 items-center gap-1.5 px-2 text-[13px] text-success">
        <Check aria-hidden className="size-4" />
        Installed
      </span>
    );
  return (
    <Button size="pill" onClick={onInstall}>
      <Download aria-hidden />
      Install
    </Button>
  );
}

function Details({
  ext,
  all,
  state,
  onClose,
  onInstall,
  onMove,
  onConnections,
  onRemove,
}: Readonly<{
  ext: Ext | null;
  all: Ext[];
  state: FactoryState;
  onClose: () => void;
  onInstall: (e: Ext) => void;
  onMove: (from: Ext, to: Ext) => void;
  onConnections: () => void;
  onRemove: (e: Ext) => void;
}>) {
  const [refused, setRefused] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // In A the boards are a setting of Factory, not extensions that need it.
  const needing = (ext ? neededBy(ext, all) : []).filter(
    (e) => VARIANT !== "A" || !e.tracker,
  );
  const groups =
    ext?.on && ext.real
      ? state.settings.filter((g) => ext.settings.includes(g.id))
      : [];
  return (
    <Dialog
      open={ext !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRefused(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        {ext?.kit ? (
          <KitDetails ext={ext} kit={ext.kit} />
        ) : ext && (
          <div className="grid gap-4">
            <div className="flex items-center gap-3.5 pr-6">
              <Logo ext={ext} big />
              <div className="grid min-w-0 flex-1 gap-1">
                <DialogTitle className="truncate">{ext.name}</DialogTitle>
                <Maker ext={ext} />
              </div>
            </div>
            <DialogDescription>{ext.about}</DialogDescription>
            <Part title="What it adds">
              <Adds ext={ext} skip={VARIANT === "B" ? "Home blocks" : undefined} />
            </Part>
            {VARIANT === "B" && ext.adds.blocks.length > 0 && (
              <Part title="Home blocks">
                <div className="flex flex-wrap gap-1.5">
                  {ext.adds.blocks.map((b) => (
                    <span key={b} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  They are in Home's “Add a block” while it is installed.
                </p>
              </Part>
            )}
            {VARIANT === "A" && ext.id === "factory" && (
              <Part title="Add-ons">
                <p className="text-xs text-muted-foreground">
                  Where your cards live: pick one.
                </p>
                <div className="grid gap-2">
                  {all
                    .filter((e) => e.tracker)
                    .map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg p-2",
                          t.on && "bg-success/[0.07]",
                        )}
                      >
                        <Logo ext={t} />
                        <span className="flex-1 text-[13px] font-medium">{t.name}</span>
                        {t.on ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                            In use
                            <Check aria-hidden className="size-4" />
                          </span>
                        ) : (
                          <TrackerAction
                            ext={t}
                            trackers={all.filter((e) => e.tracker)}
                            onMove={onMove}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </Part>
            )}
            <Part title="What it needs">
              {ext.needs.length > 0 ? (
                <Needs ext={ext} />
              ) : (
                VARIANT !== "B" && <span className="text-[13px]">Nothing</span>
              )}
              {VARIANT === "B" && (
                <p className="text-[13px]">
                  Needs:{" "}
                  <button
                    type="button"
                    onClick={onConnections}
                    className="text-blue hover:underline"
                  >
                    Your code, Your tasks
                  </button>
                </p>
              )}
            </Part>
            <Part title="What needs it">
              <span className="text-[13px]">
                {needing.length === 0
                  ? "Nothing installed needs it."
                  : needing.map((e) => e.name).join(", ")}
              </span>
            </Part>
            <Part title="Settings">
              {groups.length > 0 ? (
                <div className="grid gap-4">
                  {groups.map((g) => (
                    <GroupForm key={g.id} group={g} state={state} />
                  ))}
                </div>
              ) : ext.fields.length > 0 ? (
                <dl className="grid gap-1.5 text-[13px]">
                  {ext.fields.map((f) => (
                    <div key={f.label} className="flex gap-3">
                      <dt className="w-[140px] text-muted-foreground">{f.label}</dt>
                      <dd className="break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {ext.on ? "It has no settings." : "Install it to see its settings."}
                </span>
              )}
            </Part>
            {refused && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                {refused}
              </p>
            )}
            <div className="flex justify-end gap-2">
              {ext.tracker ? (
                ext.on ? (
                  <span className="inline-flex h-8 items-center gap-1.5 px-2 text-[13px] text-success">
                    <Check aria-hidden className="size-4" />
                    In use
                  </span>
                ) : (
                  <TrackerAction
                    ext={ext}
                    trackers={all.filter((e) => e.tracker)}
                    onMove={onMove}
                  />
                )
              ) : ext.id === "factory" ? (
                <span className="text-[13px] text-muted-foreground">
                  Always needed: it builds everything
                </span>
              ) : ext.on ? (
                <Button
                  variant="ring"
                  size="pill"
                  onClick={() => {
                    if (needing.length > 0) {
                      setRefused(
                        `${needing.map((e) => e.name).join(" and ")} ${needing.length === 1 ? "needs" : "need"} ${ext.name}. Remove ${needing.length === 1 ? "it" : "them"} first.`,
                      );
                      return;
                    }
                    setRefused(null);
                    setConfirming(true);
                  }}
                >
                  Remove
                </Button>
              ) : (
                <InstallButton
                  ext={ext}
                  onInstall={() => {
                    onClose();
                    onInstall(ext);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogTitle>Remove {ext?.name}?</DialogTitle>
          <DialogDescription>
            {ext && goesOf(ext)}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="ring"
              size="pill"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="pill"
              onClick={() => {
                setConfirming(false);
                if (ext) onRemove(ext);
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// The products that use a kit: a small chip each, with its initial.
function UsedBy({
  products,
  label = true,
}: Readonly<{ products: string[]; label?: boolean }>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && (
        <span className="text-[11px] text-muted-foreground">Used by</span>
      )}
      {products.map((name) => (
        <span
          key={name}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-card/80 py-0 pr-2.5 pl-1 text-xs shadow-soft"
        >
          <span
            aria-hidden
            className="grid size-4 place-items-center rounded-full bg-blue/15 text-[9px] font-semibold text-blue"
          >
            {name.charAt(0)}
          </span>
          {name}
        </span>
      ))}
    </div>
  );
}

// B: the product kits Kobble comes with, and the team's own.
function KitsTab({ onOpen }: Readonly<{ onOpen: (id: string) => void }>) {
  return (
    <section aria-label="Product kits" className="grid gap-4">
      <p className="px-1 text-[13px] text-muted-foreground">
        Kobble comes with these kits. Each teaches the kobolds one kind of
        product.
      </p>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KITS.map((k) => (
          <Card
            key={k.id}
            ext={k}
            usedBy={k.kit?.usedBy}
            onOpen={() => {
              onOpen(k.id);
            }}
            action={null}
          />
        ))}
      </div>
    </section>
  );
}

// A product kit's details: what it brings, who uses it, and why it stays.
function KitDetails({
  ext,
  kit,
}: Readonly<{ ext: Ext; kit: { usedBy: string[]; brings: string[] } }>) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3.5 pr-6">
        <Logo ext={ext} big />
        <div className="grid min-w-0 flex-1 gap-1">
          <DialogTitle className="truncate">{ext.name}</DialogTitle>
          <span className="inline-flex h-5 w-fit items-center rounded-full bg-surface-2 px-2 text-[11px] font-medium text-muted-foreground">
            {ext.maker === "team" ? "Product kit · Your team" : "Pre-installed with Kobble"}
          </span>
        </div>
      </div>
      <DialogDescription>{ext.about}</DialogDescription>
      <Part title="What it brings">
        <ul className="grid gap-1 text-[13px]">
          {kit.brings.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Part>
      <Part title="Used by">
        {kit.usedBy.length > 0 ? (
          <UsedBy products={kit.usedBy} />
        ) : (
          <span className="text-[13px]">No product yet.</span>
        )}
      </Part>
    </div>
  );
}

// What goes when it is removed, and what stays in the factory's files.
const STAYS: Record<string, string> = {
  explorations: "its explorations",
  signals: "its signals",
  personas: "its personas and their missions",
  releases: "its releases",
};

function goesOf(ext: Ext): string {
  const goes = [
    ext.adds.pages.length > 0 && "page",
    ext.adds.blocks.length > 0 && "Home blocks",
    ext.adds.kobolds.length > 0 && "kobold",
  ].filter((x): x is string => x !== false);
  const verb = goes.length > 1 || goes[0] === "Home blocks" ? "go" : "goes";
  const list = goes.length > 1 ? `${goes.slice(0, -1).join(", ")} and ${goes[goes.length - 1]}` : (goes[0] ?? "");
  return `Its ${list} ${verb}; ${STAYS[ext.id] ?? "what it made"} stay${STAYS[ext.id] ? "" : "s"} in the factory's files.`;
}

function Part({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-1.5 border-t border-border-soft pt-3">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

// ---- Variant B: one details dialog for an extension, a connection and a kit ----

type DetailsProps = {
  ext: Ext | null;
  all: Ext[];
  state: FactoryState;
  onClose: () => void;
  onInstall: (e: Ext) => void;
  onMove: (from: Ext, to: Ext) => void;
  onConnections: () => void;
  onOpen: (id: string) => void;
  onRemove: (e: Ext) => void;
};

function DetailsOf(props: Readonly<DetailsProps>) {
  return VARIANT === "B" ? <DetailsB {...props} /> : <Details {...props} />;
}

// A small pill; clickable when it leads somewhere.
function Chip({
  label,
  onClick,
}: Readonly<{ label: string; onClick?: () => void }>) {
  const look =
    "inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(look, "hover:bg-hover hover:text-blue")}
    >
      {label}
    </button>
  ) : (
    <span className={look}>{label}</span>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-2 border-t border-border-soft px-6 py-4">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function DetailsB({
  ext,
  all,
  state,
  onClose,
  onInstall,
  onMove,
  onConnections,
  onOpen,
  onRemove,
}: Readonly<DetailsProps>) {
  const [refused, setRefused] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const kit = ext?.kit;
  const connection = ext?.tracker === true;
  const needing = ext ? neededBy(ext, all) : [];
  const trackers = all.filter((e) => e.tracker);
  const groups =
    ext?.on && ext.real
      ? state.settings.filter((g) => ext.settings.includes(g.id))
      : [];
  const state_ = !ext
    ? null
    : kit
      ? ext.maker === "kobble"
        ? "Pre-installed"
        : "Installed"
      : ext.on
        ? connection
          ? "In use"
          : "Installed"
        : null;
  const usedByExts = ext && connection
    ? all.filter(
        (e) =>
          e.on &&
          (e.id === "factory" || (ext.id === "github" && e.id === "releases")),
      )
    : [];
  const brings = ext
    ? [
        { label: ext.adds.pages.length > 1 ? "Pages" : "Page", names: ext.adds.pages },
        { label: "Home blocks", names: ext.adds.blocks },
        { label: ext.stages.length > 1 ? "Stages" : "Stage", names: ext.stages },
        { label: ext.adds.kobolds.length > 1 ? "Kobolds" : "Kobold", names: ext.adds.kobolds },
      ].filter((r) => r.names.length > 0)
    : [];
  const extraNeeds = ext
    ? ext.needs.filter((n) => !all.some((e) => e.name === n))
    : [];
  const action = !ext ? null : connection && !ext.on ? (
    <TrackerAction ext={ext} trackers={trackers} onMove={onMove} />
  ) : !kit && !connection && !ext.on ? (
    <InstallButton
      ext={ext}
      onInstall={() => {
        onClose();
        onInstall(ext);
      }}
    />
  ) : null;
  return (
    <Dialog
      open={ext !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRefused(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-[20px] p-0 sm:max-w-[600px]">
        {ext && (
          <div className="grid">
            <div className="flex flex-wrap items-start gap-4 p-6 pr-14">
              <Logo ext={ext} big />
              <div className="grid min-w-0 flex-1 basis-[220px] gap-1">
                <DialogTitle className="truncate">{ext.name}</DialogTitle>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {ext.maker === "team" && <Users aria-hidden className="size-3" />}
                  {ext.maker === "team" ? "Made by your team" : "Made by Kobble"}
                </span>
                <DialogDescription className="text-[13px]">
                  {ext.about}
                </DialogDescription>
              </div>
              {(state_ || action) && (
                <div className="grid justify-items-end gap-2">
                  {state_ && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                      {state_}
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
            {(kit || brings.length > 0) && (
              <Section title="What it brings">
                {kit ? (
                  <div className="flex flex-wrap gap-1.5">
                    {kit.brings.map((b) => (
                      <Chip key={b} label={b} />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    {brings.map((r) => (
                      <Row key={r.label} label={r.label}>
                        {r.names.map((n) => (
                          <Chip key={n} label={n} />
                        ))}
                      </Row>
                    ))}
                  </div>
                )}
              </Section>
            )}
            {!kit && (
              <Section title="Needs">
                <div className="flex flex-wrap gap-1.5">
                  {ext.needsIds.map((id) => {
                    const needed = all.find((e) => e.id === id);
                    return needed ? (
                      <Chip
                        key={id}
                        label={needed.name}
                        onClick={() => {
                          onOpen(id);
                        }}
                      />
                    ) : null;
                  })}
                  {!connection && (
                    <>
                      <Chip label="Your code" onClick={onConnections} />
                      <Chip label="Your tasks" onClick={onConnections} />
                    </>
                  )}
                  {extraNeeds.map((n) => (
                    <Chip key={n} label={n} />
                  ))}
                </div>
              </Section>
            )}
            {!kit && !connection && (
              <Section title="Needed by">
                {needing.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nothing installed needs it.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {needing.map((e) => (
                      <Chip
                        key={e.id}
                        label={e.name}
                        onClick={() => {
                          onOpen(e.id);
                        }}
                      />
                    ))}
                  </div>
                )}
              </Section>
            )}
            {connection && (
              <Section title="Used by">
                <div className="flex flex-wrap gap-1.5">
                  {usedByExts.map((e) => (
                    <Chip
                      key={e.id}
                      label={e.name}
                      onClick={() => {
                        onOpen(e.id);
                      }}
                    />
                  ))}
                </div>
              </Section>
            )}
            {kit && (
              <Section title="Used by">
                {kit.usedBy.length > 0 ? (
                  <UsedBy products={kit.usedBy} label={false} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No product yet.
                  </span>
                )}
              </Section>
            )}
            {(groups.length > 0 || ext.fields.length > 0) && (
              <Section title="Settings">
                {groups.length > 0 ? (
                  <div className="grid gap-4">
                    {groups.map((g) => (
                      <GroupForm key={g.id} group={g} state={state} />
                    ))}
                  </div>
                ) : (
                  <dl className="grid gap-1.5 text-[13px]">
                    {ext.fields.map((f) => (
                      <div key={f.label} className="flex gap-3">
                        <dt className="w-[140px] text-muted-foreground">
                          {f.label}
                        </dt>
                        <dd className="break-words">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Section>
            )}
            {!kit && !connection && ext.on && (
              <div className="grid gap-2 border-t border-border-soft px-6 py-4">
                {refused && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
                  >
                    {refused}
                  </p>
                )}
                {ext.id === "factory" ? (
                  <span className="text-xs text-muted-foreground">
                    Always needed: it builds everything
                  </span>
                ) : (
                  <button
                    type="button"
                    className="w-fit text-[13px] text-destructive hover:underline"
                    onClick={() => {
                      if (needing.length > 0) {
                        setRefused(
                          `${needing.map((e) => e.name).join(" and ")} ${needing.length === 1 ? "needs" : "need"} ${ext.name}. Remove ${needing.length === 1 ? "it" : "them"} first.`,
                        );
                        return;
                      }
                      setRefused(null);
                      setConfirming(true);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogTitle>Remove {ext?.name}?</DialogTitle>
          <DialogDescription>{ext && goesOf(ext)}</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="ring"
              size="pill"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="pill"
              onClick={() => {
                setConfirming(false);
                if (ext) onRemove(ext);
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
