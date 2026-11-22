// A card opened beside the board: its type (changed with a click), where
// the work is, what it asks for, the agreed plan, the pull request, and the
// conversation with the factory; GitHub is a link away. Esc or the
// backdrop closes it. A card not wanted any more is deleted at its foot,
// after a second click: closed as not planned and taken off the board.

import { ArrowUpRight, GitPullRequest, SquareTerminal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { get, messageOf, post } from "@/api/client";
import { AgentTrace } from "@/components/agent-trace";
import { KoboldHead } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

import type { CardPanel as Panel } from "../../../../server/src/extensions/factory/factory-card.ts";
import { type CardType, TypePicker } from "@/components/card-type";
import { DeleteCard } from "./delete-card";
import { useLocale, useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";
import { momentIn } from "@/i18n/format";

export function CardPanel({
  number,
  title,
  trace,
  onClose,
  onDelete,
}: Readonly<{
  number: number;
  // Shown at once, from the board, while the rest loads.
  title: string | null;
  // What the builder did on it so far, while it builds.
  trace: string[];
  onClose: () => void;
  onDelete: () => void;
}>) {
  const t = useT();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The card, or what the builder does on it (while it builds).
  const [tab, setTab] = useState<"card" | "trace">("card");
  useEffect(() => {
    let current = true;
    get<Panel>(`/api/kobble/factory/card?number=${String(number)}`).then(
      (read) => {
        if (current) setPanel(read);
      },
      (error: unknown) => {
        if (current) setProblem(messageOf(error));
      },
    );
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => {
      current = false;
      window.removeEventListener("keydown", close);
    };
  }, [number, onClose]);
  const pick = (type: CardType | null) => {
    if (!panel) return;
    setPanel({ ...panel, type });
    post("/api/kobble/factory/type", { number, type: type ?? "none" }).catch(
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label={t.factory.panel.close}
        className="absolute inset-0 bg-[rgb(20_24_36/0.18)]"
        onClick={onClose}
      />
      <aside
        aria-label={t.factory.panel.cardLabel(number)}
        className="relative flex h-full w-[460px] max-w-full animate-slide-in flex-col overflow-y-auto bg-card shadow-[-12px_0_40px_-16px_rgb(20_24_36/0.25)]"
      >
        <PanelHead number={number} url={panel?.url ?? null} onClose={onClose} />
        {problem && (
          <p className="px-5 pt-4 text-[13px] text-destructive">{problem}</p>
        )}
        {trace.length > 0 && <Tabs tab={tab} onTab={setTab} steps={trace} />}
        {tab === "trace" && trace.length > 0 ? (
          <div className="p-5">
            <AgentTrace steps={trace} live />
          </div>
        ) : (
          <Shown panel={panel} problem={problem} title={title} onPick={pick} />
        )}
        {panel && (
          <DeleteCard
            number={number}
            building={panel.building}
            onDelete={onDelete}
          />
        )}
      </aside>
    </div>
  );
}

function PanelHead({
  number,
  url,
  onClose,
}: Readonly<{ number: number; url: string | null; onClose: () => void }>) {
  const t = useT();
  return (
    <header className="flex items-center gap-2 border-b border-border-soft px-5 py-3.5">
      <span className="text-[13px] text-muted-foreground">#{number}</span>
      <span className="flex-1" />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"
        >
          {t.factory.openOnGitHub}{" "}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      )}
      <button
        type="button"
        aria-label={t.factory.panel.close}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-ground"
        onClick={onClose}
      >
        <X className="size-4" aria-hidden />
      </button>
    </header>
  );
}

// The card, or its trace while the builder is on it.
function Tabs({
  tab,
  onTab,
  steps,
}: Readonly<{
  tab: "card" | "trace";
  onTab: (tab: "card" | "trace") => void;
  steps: string[];
}>) {
  const t = useT().builder.trace;
  const tabs = [
    { id: "card" as const, name: t.card },
    { id: "trace" as const, name: t.tab(steps.length) },
  ];
  return (
    <div
      role="tablist"
      className="flex gap-1 border-b border-border-soft px-5 pt-2"
    >
      {tabs.map((one) => (
        <button
          key={one.id}
          type="button"
          role="tab"
          aria-selected={tab === one.id}
          onClick={() => {
            onTab(one.id);
          }}
          className={cn(
            "-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[13px]",
            tab === one.id
              ? "border-foreground font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {one.id === "trace" && (
            <SquareTerminal aria-hidden className="size-3.5" />
          )}
          {one.name}
        </button>
      ))}
    </div>
  );
}

// The card's own page: what it is, or a sketch of it while it loads.
function Shown({
  panel,
  problem,
  title,
  onPick,
}: Readonly<{
  panel: Panel | null;
  problem: string | null;
  title: string | null;
  onPick: (type: CardType | null) => void;
}>) {
  if (panel) return <Body panel={panel} onPick={onPick} />;
  return problem ? null : <Loading title={title} />;
}

function Loading({ title }: Readonly<{ title: string | null }>) {
  return (
    <div className="grid gap-3 p-5">
      {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
      {[70, 40, 90].map((width) => (
        <span
          key={width}
          className="h-4 animate-pulse rounded bg-ground"
          style={{ width: `${String(width)}%` }}
        />
      ))}
    </div>
  );
}

function Body({
  panel,
  onPick,
}: Readonly<{ panel: Panel; onPick: (type: CardType | null) => void }>) {
  const t = useT();
  return (
    <div className="grid gap-6 px-5 py-5">
      <div className="grid gap-3">
        <h2 className="text-base leading-snug font-semibold">{panel.title}</h2>
        <TypePicker type={panel.type} onPick={onPick} />
        <p className="flex items-center gap-2 rounded-xl bg-ground px-3 py-2 text-[13px] text-foreground-2">
          <KoboldHead size={20} /> {panel.status}
        </p>
      </div>
      {panel.pullRequest && <PullRequest pr={panel.pullRequest} />}
      {panel.about && (
        <Section title={t.factory.panel.asksFor} text={panel.about} />
      )}
      {panel.plan && <Section title={t.factory.panel.plan} text={panel.plan} />}
      <Conversation said={panel.said} />
    </div>
  );
}

function PullRequest({
  pr,
}: Readonly<{ pr: NonNullable<Panel["pullRequest"]> }>) {
  const t = useT();
  const state = prStateOf(pr, t.factory.panel);
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgb(20_24_36/0.3)]"
    >
      <GitPullRequest className="size-5 text-primary" aria-hidden />
      <span className="flex-1 font-semibold">
        {t.factory.panel.pullRequest}
      </span>
      <span className="rounded-full bg-wash px-2.5 py-0.5 text-xs font-medium text-wash-foreground">
        {state}
      </span>
    </a>
  );
}

function Section({ title, text }: Readonly<{ title: string; text: string }>) {
  return (
    <section className="grid gap-2">
      <h3 className="text-[13px] font-semibold text-muted-foreground">
        {title}
      </h3>
      <div className="text-[13px] leading-relaxed">
        <Markdown text={text} />
      </div>
    </section>
  );
}

function Conversation({ said }: Readonly<{ said: Panel["said"] }>) {
  const locale = useLocale();
  const t = useT();
  if (said.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h3 className="text-[13px] font-semibold text-muted-foreground">
        {t.factory.panel.conversation}
      </h3>
      {said.map((one, at) => (
        <div
          key={at}
          className={cn(
            "grid gap-1 rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            one.by === "factory" ? "bg-ground" : "bg-wash",
          )}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {one.by === "factory" ? <KoboldHead size={16} /> : null}
            {one.by === "factory" ? "Kobble" : one.author}
            <span className="font-normal">· {momentIn(locale, one.at)}</span>
          </span>
          <Markdown text={one.text} />
        </div>
      ))}
    </section>
  );
}

function prStateOf(
  pr: NonNullable<Panel["pullRequest"]>,
  m: Messages["factory"]["panel"],
): string {
  if (pr.state === "MERGED") return m.merged;
  if (pr.state !== "OPEN") return m.closed;
  return pr.draft ? m.draft : m.open;
}
