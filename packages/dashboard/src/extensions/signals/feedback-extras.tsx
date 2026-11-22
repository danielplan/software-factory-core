// What a post from the public feedback board adds to a signal: the board's
// icon, where the post stands (sent, seen, planned, done), the persona the
// kobold matched it to, with its reason, and a way to change or remove it.

import { ExternalLink, MessageSquareHeart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, type PersonaRow, post, type SignalRow } from "@/api/client";
import {
  issueUrl,
  type State,
  stateOf,
  useBoardName,
  useOnBoard,
  useMine,
} from "@/api/feedback-board";
import { StatePill } from "./state-pill";
import { type Read, useRead } from "@/api/use-read";
import { cn } from "@/lib/utils";

import { FaceOf } from "@/components/page-bits";

const STEPS: State[] = ["sent", "seen", "planned", "done"];

export function BoardIcon({ size = 34 }: Readonly<{ size?: number }>) {
  const t = useTranslation().t;
  return (
    <span
      title={t("words.sources.feedback")}
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

// Four small steps, and the one the post is at.
export function StateBar({ state }: Readonly<{ state: State }>) {
  const at = STEPS.indexOf(state);
  return (
    <div className="flex items-center gap-3">
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
      <StatePill state={state} />
    </div>
  );
}

// The number of the post on the board a signal came from (feedback-12).
export const numberOf = (signal: Pick<SignalRow, "sourceId">): number =>
  Number(signal.sourceId?.replace("feedback-", "")) || 0;

// Where a post stands on the board; "sent" while the board is not read.
function useStateOf(signal: Pick<SignalRow, "sourceId">): State {
  const posts = useOnBoard();
  const mine = useMine();
  const number = numberOf(signal);
  return stateOf(posts, number) ?? stateOf(mine, number) ?? "sent";
}

// Under a signal in the list: its source and where the post stands.
export function FeedbackLine({
  signal,
}: Readonly<{ signal: Pick<SignalRow, "sourceId"> }>) {
  const t = useTranslation().t;
  const state = useStateOf(signal);
  return (
    <span className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
      {t("words.sources.feedback")}
      <StatePill state={state} />
    </span>
  );
}

function usePersonas(): PersonaRow[] {
  const { data } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  return data?.personas ?? [];
}

const LINK =
  "text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline";

// Who the kobold thinks wrote it, and why; Change picks another persona,
// Remove leaves it with none (and, with none, the personas to pick from).
function PersonaLine({ signal }: Readonly<{ signal: SignalRow }>) {
  const t = useTranslation().t;
  const personas = usePersonas();
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (persona: string | null) => {
    setPicking(false);
    post("/api/feedback/persona", { id: signal.id, persona }).then(
      () => {
        setProblem(null);
      },
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  const name = signal.personaName;
  let said = t("feedback.personaUnsure");
  if (name)
    said = signal.why
      ? t("feedback.personaSure", { name, why: signal.why })
      : t("feedback.personaPicked", { name });
  return (
    <div className="mb-[22px] grid gap-3 rounded-[12px] bg-surface px-4 py-3.5">
      <p className="text-[13px] leading-normal text-foreground-2">{said}</p>
      {name && (
        <span className="flex gap-5">
          <button
            type="button"
            className={LINK}
            onClick={() => {
              setPicking(!picking);
            }}
          >
            {t("feedback.change")}
          </button>
          <button
            type="button"
            className={LINK}
            onClick={() => {
              set(null);
            }}
          >
            {t("feedback.remove")}
          </button>
        </span>
      )}
      {(picking || !name) && personas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {personas
            .filter((persona) => persona.id !== signal.persona)
            .map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  set(persona.id);
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pr-3 pl-1 text-[12.5px] hover:bg-surface-2"
              >
                <FaceOf face={persona.face} size={20} />
                {persona.name}
              </button>
            ))}
        </div>
      )}
      {problem && <p className="text-[12px] text-destructive">{problem}</p>}
    </div>
  );
}

// In the picked signal, between its words and its buttons: how many teams
// want it, the persona, where it stands and the link to the post.
export function FeedbackExtras({ signal }: Readonly<{ signal: SignalRow }>) {
  const t = useTranslation().t;
  const board = useBoardName();
  const posts = useOnBoard();
  const number = numberOf(signal);
  const state = useStateOf(signal);
  const thumbs = posts.find((one) => one.number === number)?.thumbs ?? 0;
  return (
    <>
      {thumbs > 0 && (
        <p className="mb-4 text-[13px] text-muted-foreground">
          {t("feedback.teamsWant", { count: thumbs })}
        </p>
      )}
      <PersonaLine signal={signal} />
      <div className="mb-[22px]">
        <StateBar state={state} />
      </div>
      <a
        href={issueUrl(number)}
        target="_blank"
        rel="noreferrer"
        className="mb-[22px] inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
      >
        #{number} · {board}
        <ExternalLink aria-hidden />
      </a>
    </>
  );
}
