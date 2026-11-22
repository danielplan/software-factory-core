// The marketplace, a page of its own. A search field and filters, the
// extensions as cards in a grid; a click opens one's details. Installing one
// that needs another asks first and installs both; removing one that others
// need is refused, with why. Where GitHub and Jira belong differs by variant:
// A, a setting in Factory's details; B, a Connections tab; C, a group here.

import { Check, Download, Search } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";

import { Adds, Logo, Maker, Needs } from "./bits";
import { type Ext, missingFor, neededBy, useExtensions } from "./data";

const FILTERS = ["All", "Installed", "Kobble's", "Your team's"] as const;
type Filter = (typeof FILTERS)[number];

const fits = (e: Ext, filter: Filter) =>
  filter === "All" ||
  (filter === "Installed" && e.on) ||
  (filter === "Kobble's" && e.maker === "kobble") ||
  (filter === "Your team's" && e.maker === "team");

export function MarketPage({ state }: Readonly<{ state: FactoryState }>) {
  const { all, turn, moveCards, problem } = useExtensions(state);
  const [tab, setTab] = useState<"Extensions" | "Connections">("Extensions");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
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
  const opened = all.find((e) => e.id === openId) ?? null;
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
  const install = (ext: Ext) => {
    const also = missingFor(ext, all);
    if (also.length > 0) setAsking({ ext, also });
    else turn(ext.id, true);
  };
  return (
    <div className="grid gap-5">
      <PageHead
        title={VARIANT === "B" ? "Marketplace" : "Extensions"}
        about={
          VARIANT === "B"
            ? "What your factory can do, and the services it works with."
            : "What your factory can do. Install what you need; the kobold can write your own."
        }
      />
      {VARIANT === "B" && (
        <div role="tablist" aria-label="Marketplace" className="flex gap-1 border-b border-border-soft">
          {(["Extensions", "Connections"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => {
                setTab(name);
              }}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium",
                tab === name
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {VARIANT === "B" && tab === "Connections" ? (
        <div className="grid gap-8">
          <Group title="Where the code lives" about="Pick one: the Factory builds on its branches and pull requests.">
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
            <div className="grid content-center gap-1 rounded-xl border border-dashed border-border p-4 text-[13px] text-muted-foreground">
              <span className="font-semibold">GitLab</span>
              Comes later.
            </div>
          </Group>
          <TrackerGroup
            title="Where cards live"
            about="Pick one: the Factory works the cards there."
            trackers={trackers}
            onOpen={setOpenId}
            onMove={(from, to) => {
              setMoving({ from, to });
            }}
          />
          <Group title="Where the team chats" about="For notes and questions from the kobolds.">
            <div className="grid content-center gap-1 rounded-xl border border-dashed border-border p-4 text-[13px] text-muted-foreground">
              <span className="font-semibold">Slack</span>
              Comes later.
            </div>
          </Group>
        </div>
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
              <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((ext) => (
                  <Card
                    key={ext.id}
                    ext={ext}
                    note={
                      VARIANT === "A" && ext.id === "factory"
                        ? `Add-on: ${trackers.find((t) => t.on)?.name ?? "none yet"}`
                        : undefined
                    }
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
      <Details
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
        onRemove={(e) => {
          turn(e.id, false);
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
                  for (const e of [...asking.also, asking.ext]) turn(e.id, true);
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
  label = "Installed",
}: Readonly<{
  ext: Ext;
  onOpen: () => void;
  // A small line under the one-liner.
  note?: string;
  // What to press; none once it is in.
  action: React.ReactNode;
  label?: "Installed" | "In use" | "Connected";
}>) {
  return (
    <article
      aria-label={ext.name}
      className={cn(
        "relative grid content-between gap-3.5 rounded-xl p-4 transition-shadow hover:shadow-card",
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
            <span className="truncate font-semibold">{ext.name}</span>
            {ext.maker === "team" && <Maker ext={ext} />}
          </div>
          {ext.on && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-success">
              {label !== "Installed" && label}
              <span
                role="img"
                aria-label={label}
                className="grid size-5 flex-none place-items-center rounded-full bg-success text-white"
              >
                <Check aria-hidden className="size-3" strokeWidth={3} />
              </span>
            </span>
          )}
        </div>
        <p className="text-[13px] text-foreground/75">{ext.about}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {action && <div className="relative flex justify-end">{action}</div>}
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
      <div className="grid items-stretch gap-4 sm:grid-cols-2">{children}</div>
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
      <div className="grid items-stretch gap-4 sm:grid-cols-2">
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
        {ext && (
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
                    where the code lives, where cards live
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
