// Variant F: feedback on the Signals page, as ordinary signals with the
// source "Feedback board" and where each stands (sent, seen, planned, done).
// Two kinds: what this person sent to the public feedback board, and, in
// the factory that reads the board, posts arriving from it.
//
// PROTOTYPE: English only; the posts arriving from the board are made up,
// and Fix, Explore and Dismiss only take them off the list here.

import { ExternalLink, MessageSquareHeart } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import type { PersonaRow } from "@/api";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import {
  BOARD,
  issueUrl,
  type Kind,
  ON_BOARD,
  type State,
  useMine,
} from "@/feedback/feedback-board";
import { StatePill } from "@/feedback/feedback-row";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";

import { CARD, FaceOf, TypeChip } from "./bits";

export type FeedbackSignal = {
  id: string;
  number: number;
  kind: Kind;
  title: string;
  state: State;
  // Sent by this person, or arriving from the board.
  from: "you" | "board";
  who: string;
  thumbs: number;
  // When it was sent or arrived, as in a signal (made up for the older ones).
  at: string;
  // For a post arriving from the board: the persona it fits, matched by the
  // kobold (with its reason) or picked by a person; null when nobody is sure.
  persona: PersonaRow | null;
  why: string | null;
  pickedBy: "kobold" | "you" | null;
};

// PROTOTYPE: the kobold's matches, made up. Which persona (its id, or the
// nth persona when the product has no such id) and why, in a few words.
// #35 is the one it is not sure about.
const MATCHES: Record<number, { id: string; nth: number; why: string }> = {
  41: {
    id: "bruno",
    nth: 0,
    why: "they lose a morning when something stops halfway and nobody says why",
  },
  38: {
    id: "mia",
    nth: 1,
    why: "they want things done while they get on with the rest",
  },
  29: {
    id: "noah",
    nth: 2,
    why: "they say what they think elsewhere, not in the app",
  },
};

// A person's corrections, for the visit: a persona's id, or null for none.
let corrected = new Map<number, string | null>();
const correctionListeners = new Set<() => void>();

export function correct(number: number, persona: string | null) {
  corrected = new Map(corrected).set(number, persona);
  for (const listener of correctionListeners) listener();
}

const subscribeCorrections = (listener: () => void) => {
  correctionListeners.add(listener);
  return () => correctionListeners.delete(listener);
};

export function usePersonas(): PersonaRow[] {
  const { data } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  return data?.personas ?? [];
}

function personaOf(
  number: number,
  personas: PersonaRow[],
  fixes: Map<number, string | null>,
): Pick<FeedbackSignal, "persona" | "why" | "pickedBy"> {
  if (fixes.has(number)) {
    const id = fixes.get(number);
    const persona = personas.find((one) => one.id === id) ?? null;
    return { persona, why: null, pickedBy: persona ? "you" : null };
  }
  const match = MATCHES[number];
  const persona = match
    ? (personas.find((one) => one.id === match.id) ??
      personas[match.nth] ??
      null)
    : null;
  return persona
    ? { persona, why: match?.why ?? null, pickedBy: "kobold" }
    : { persona: null, why: null, pickedBy: null };
}

// Made-up times for the posts nobody sent in this visit: hours ago.
const LOADED = Date.now();
const HOURS_AGO: Record<number, number> = {
  44: 30,
  41: 2,
  38: 9,
  35: 20,
  33: 75,
  29: 50,
  27: 120,
  22: 100,
};
const atOf = (number: number, sent = 0) =>
  new Date(
    sent > 0 ? sent : LOADED - (HOURS_AGO[number] ?? 48) * 3_600_000,
  ).toISOString();

// Who sent the posts arriving from the board (made up).
const SENDERS: Record<number, string> = {
  41: "@harbor-team",
  38: "@north-studio",
  35: "@lumen-labs",
  29: "@quay-works",
  22: "@pine-co",
};

// Arrivals handled here, for the visit.
let handled = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function handle(id: string) {
  handled = new Set([...handled, id]);
  for (const listener of listeners) listener();
}

export function useFeedbackSignals(): FeedbackSignal[] {
  const mine = useMine();
  const done = useSyncExternalStore(subscribe, () => handled);
  const fixes = useSyncExternalStore(subscribeCorrections, () => corrected);
  const personas = usePersonas();
  const sent = mine.map((one): FeedbackSignal => ({
    id: `board-${String(one.number)}`,
    number: one.number,
    kind: one.kind,
    title: one.title,
    state: one.state,
    from: "you",
    who: "You",
    thumbs: ON_BOARD.find((there) => there.number === one.number)?.thumbs ?? 1,
    at: atOf(one.number, one.sent),
    persona: null,
    why: null,
    pickedBy: null,
  }));
  const arriving = ON_BOARD.filter(
    (one) =>
      !mine.some((m) => m.number === one.number) &&
      !done.has(`board-${String(one.number)}`),
  ).map((one): FeedbackSignal => ({
    id: `board-${String(one.number)}`,
    number: one.number,
    kind: one.kind,
    title: one.title,
    state: one.state,
    from: "board",
    who: SENDERS[one.number] ?? "A team",
    thumbs: one.thumbs,
    at: atOf(one.number),
    ...personaOf(one.number, personas, fixes),
  }));
  return [...arriving.slice(0, 4), ...sent];
}

// The filter at the top: every signal, or only the feedback.
export function Filter({
  feedback,
  count,
  onPick,
}: Readonly<{
  feedback: boolean;
  count: number;
  onPick: (feedback: boolean) => void;
}>) {
  const chip = (on: boolean, words: string, pick: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        onPick(pick);
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors",
        on
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-foreground-2 hover:bg-surface",
      )}
    >
      {words}
    </button>
  );
  return (
    <div className="flex items-center gap-1.5">
      {chip(!feedback, "All", false)}
      {chip(feedback, `Feedback · ${String(count)}`, true)}
    </div>
  );
}

const typeOf = (kind: Kind) => (kind === "bug" ? "bug" : "request");

function BoardIcon({ size = 34 }: Readonly<{ size?: number }>) {
  return (
    <span
      title="Feedback board"
      style={{ width: size, height: size }}
      className="grid flex-none place-items-center rounded-full bg-[#8b8ff0]/12 text-[#6366d8]"
    >
      <MessageSquareHeart
        aria-hidden
        strokeWidth={2}
        style={{ width: size / 2 }}
      />
    </span>
  );
}

// Where it comes from, in a few words.
const sourceLine = (one: FeedbackSignal) =>
  one.from === "you" ? "Sent to the feedback board" : "From the feedback board";

// Its face: the board's icon for what this person sent; for a post from
// the board, the persona it fits, or an empty tile.
function FaceFor({
  one,
  size,
}: Readonly<{ one: FeedbackSignal; size: number }>) {
  if (one.from === "you") return <BoardIcon size={size} />;
  if (one.persona)
    return (
      <span title={one.persona.name} className="flex-none">
        <FaceOf face={one.persona.face} size={size} />
      </span>
    );
  return (
    <span
      title="No persona yet"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      className="flex-none border border-dashed border-border bg-surface"
    />
  );
}

// Its name in the list: the persona, or that there is none yet.
const nameOf = (one: FeedbackSignal) =>
  one.from === "you" ? one.who : (one.persona?.name ?? "No persona yet");

// A feedback signal in the list.
export function FeedbackItem({
  one,
  picked,
  href,
}: Readonly<{ one: FeedbackSignal; picked: boolean; href: string }>) {
  return (
    <a
      href={href}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex items-start gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface",
        picked && "bg-picked hover:bg-picked",
      )}
    >
      <FaceFor one={one} size={34} />
      <span className="grid min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-semibold",
              one.from === "board" && !one.persona && "text-muted-foreground",
            )}
          >
            {nameOf(one)}
          </span>
          <span className="ml-auto">
            <TypeChip type={typeOf(one.kind)} />
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-foreground-2">
          {one.title}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
          {sourceLine(one)}
          <StatePill state={one.state} />
        </span>
      </span>
    </a>
  );
}

const STEPS: State[] = ["sent", "seen", "planned", "done"];

// The feedback signal picked: what it says, where it stands, a link to it
// on the board; one arriving from the board can be fixed or explored.
export function FeedbackDetail({
  one,
  onDone,
}: Readonly<{ one: FeedbackSignal; onDone: (said: string) => void }>) {
  const [busy, setBusy] = useState(false);
  const at = STEPS.indexOf(one.state);
  const act = (said: string) => {
    setBusy(true);
    setTimeout(() => {
      handle(one.id);
      onDone(said);
    }, 400);
  };
  return (
    <article
      aria-label={`Feedback #${String(one.number)}`}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <FaceFor one={one} size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{nameOf(one)}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {one.from === "you"
              ? "Feedback board · sent by you"
              : `Feedback board · ${one.who}`}
          </span>
        </span>
        <TypeChip type={typeOf(one.kind)} />
      </header>
      <div className="mt-5 mb-[22px] text-base leading-normal tracking-[-0.01em]">
        <Markdown text={one.title} />
        <p className="mt-2 text-[13px] text-muted-foreground">
          👍 {one.thumbs} {one.thumbs === 1 ? "team wants" : "teams want"} this
        </p>
      </div>
      {one.from === "board" && <PersonaLine one={one} />}
      <div className="mb-[22px] flex items-center gap-3">
        <span className="flex gap-1" aria-hidden>
          {STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1 w-8 rounded-full",
                index <= at ? "bg-[#8b8ff0]" : "bg-line-soft",
              )}
            />
          ))}
        </span>
        <StatePill state={one.state} />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {one.from === "board" && (
          <>
            <Button
              variant={one.kind === "bug" ? "default" : "ring"}
              size="pill"
              disabled={busy}
              onClick={() => {
                act(`Made up: sent #${String(one.number)} to be fixed`);
              }}
            >
              Fix
            </Button>
            <Button
              variant={one.kind === "bug" ? "ring" : "default"}
              size="pill"
              disabled={busy}
              onClick={() => {
                act(`Made up: #${String(one.number)} waits in Explorations`);
              }}
            >
              Explore
            </Button>
          </>
        )}
        <a
          href={issueUrl(one.number)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
        >
          #{one.number} on {BOARD}
          <ExternalLink aria-hidden />
        </a>
      </div>
      <p className="mt-4 text-[11px] text-faint">Made up for this prototype.</p>
    </article>
  );
}

// Who the kobold thinks sent it, and why; Change picks another persona,
// Remove leaves it with none. With none, the personas to pick from.
function PersonaLine({ one }: Readonly<{ one: FeedbackSignal }>) {
  const personas = usePersonas();
  const [picking, setPicking] = useState(false);
  const link =
    "text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline";
  const said = one.persona
    ? one.pickedBy === "kobold"
      ? `Sprocket thinks this is ${one.persona.name}: ${one.why ?? ""}.`
      : `You said this is ${one.persona.name}.`
    : "Sprocket isn't sure who this is.";
  const open = picking || !one.persona;
  return (
    <div className="mb-[22px] rounded-[12px] bg-surface px-3.5 py-2.5">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-foreground-2">
        <span className="min-w-0">{said}</span>
        {one.persona && (
          <span className="ml-auto flex gap-3">
            <button
              type="button"
              className={link}
              onClick={() => {
                setPicking(!picking);
              }}
            >
              Change
            </button>
            <button
              type="button"
              className={link}
              onClick={() => {
                correct(one.number, null);
                setPicking(false);
              }}
            >
              Remove
            </button>
          </span>
        )}
      </p>
      {open && personas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {personas
            .filter((persona) => persona.id !== one.persona?.id)
            .map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  correct(one.number, persona.id);
                  setPicking(false);
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pr-3 pl-1 text-[12.5px] hover:bg-surface-2"
              >
                <FaceOf face={persona.face} size={20} />
                {persona.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
