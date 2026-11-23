// "Kobble is waiting for you": a card the factory stopped on with a
// question. It says what the card is about and where the work is, asks the
// question in plain words and offers its answers (each with what it means,
// the factory's suggestion tagged); the owner picks one or writes their own
// and sends it, which posts it on the card as if written on GitHub. "Talk
// it through" opens the question as an exploration with the kobold.

import { ArrowUpRight, Check, MessagesSquare, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { FIELD_AREA } from "@/lib/field-style";
import { messageOf, post } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { answerText, type Waiting } from "./answer-text";

export function WaitingCards({ waiting }: Readonly<{ waiting: Waiting[] }>) {
  const t = useTranslation().t;
  if (waiting.length === 0) return null;
  return (
    <section aria-label={t("factory.waitingForYou")} className="grid gap-3">
      {waiting.map((one) => (
        <WaitingCard key={one.number} waiting={one} />
      ))}
    </section>
  );
}

function WaitingCard({ waiting }: Readonly<{ waiting: Waiting }>) {
  const t = useTranslation().t;
  const navigate = useNavigate();
  const [picked, pick] = useState<string | null>(null);
  const [own, write] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { ask } = waiting;
  const said = answerText(waiting, picked, own);
  const send = () => {
    setSending(true);
    setProblem(null);
    post("/api/work/answer", { number: waiting.number, text: said }).catch(
      (error: unknown) => {
        setSending(false);
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <article className="grid gap-4 rounded-xl border border-warning/40 bg-warning/[0.07] px-5 py-4">
      <WaitingHead waiting={waiting} />
      <p className="text-[15px] leading-snug font-semibold">
        <Markdown text={ask?.question ?? waiting.text} inline />
      </p>
      {ask && ask.answers.length > 0 && (
        <Answers
          ask={ask}
          picked={own.trim() ? null : picked}
          onPick={(key) => {
            pick(key);
            write("");
          }}
        />
      )}
      <label className="grid gap-1.5 text-[13px]">
        <span className="text-muted-foreground">
          {t("factory.waiting.own")}
        </span>
        <textarea
          value={own}
          onChange={(event) => {
            write(event.target.value);
            if (event.target.value.trim()) pick(null);
          }}
          rows={3}
          className={FIELD_AREA}
        />
      </label>
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="pill" disabled={!said || sending} onClick={send}>
          <Send aria-hidden />
          {sending ? t("factory.waiting.sending") : t("factory.waiting.send")}
        </Button>
        <Button
          size="pill"
          variant="ring"
          onClick={() => {
            talkItThrough(waiting).then(
              (to) => {
                if (to) void navigate(to);
              },
              (error: unknown) => {
                setProblem(messageOf(error));
              },
            );
          }}
        >
          <MessagesSquare aria-hidden className="size-4" />
          {t("factory.waiting.talk")}
        </Button>
      </div>
    </article>
  );
}

function WaitingHead({ waiting }: Readonly<{ waiting: Waiting }>) {
  const t = useTranslation().t;
  const { ask } = waiting;
  return (
    <header className="grid gap-1">
      <p className="text-[12.5px] font-medium text-foreground-2">
        {t("factory.waiting.head", {
          number: waiting.number,
          title: waiting.title,
        })}
      </p>
      {ask?.about && (
        <div className="text-[13px]">
          <Markdown text={ask.about} />
        </div>
      )}
      {ask?.where && (
        <div className="text-[13px] text-muted-foreground">
          <Markdown text={ask.where} />
        </div>
      )}
      <a
        href={waiting.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        {t("factory.waiting.whole")}{" "}
        <ArrowUpRight aria-hidden className="size-3.5" />
      </a>
    </header>
  );
}

function Answers({
  ask,
  picked,
  onPick,
}: Readonly<{
  ask: NonNullable<Waiting["ask"]>;
  picked: string | null;
  onPick: (key: string) => void;
}>) {
  const t = useTranslation().t;
  return (
    <div
      role="radiogroup"
      aria-label={t("factory.waiting.pick")}
      className="grid gap-2"
    >
      <p className="text-[13px] text-muted-foreground">
        {t("factory.waiting.pick")}
      </p>
      {ask.answers.map((one) => {
        const on = picked === one.key;
        return (
          <button
            key={one.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              onPick(one.key);
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left text-[13px]",
              on ? "border-foreground/40 bg-wash" : "border-border",
            )}
          >
            <span className="w-4 font-semibold">{one.key}</span>
            <span className="grid flex-1 gap-0.5">
              <span className="font-medium">
                <Markdown text={one.answer} inline />
              </span>
              {one.means && (
                <span className="text-muted-foreground">
                  <Markdown text={one.means} inline />
                </span>
              )}
            </span>
            {ask.suggested === one.key && (
              <span className="rounded-full bg-panel px-2 py-0.5 text-xs text-muted-foreground">
                {t("factory.waiting.suggestion")}
              </span>
            )}
            {on && <Check aria-hidden className="size-4" />}
          </button>
        );
      })}
      <p className="text-center text-xs text-faint">
        {t("factory.waiting.or")}
      </p>
    </div>
  );
}

// The question as an exploration, to open with the kobold: where it is.
async function talkItThrough(waiting: Waiting): Promise<string | null> {
  const question = waiting.ask?.question ?? waiting.text;
  const made = await post<{ exploration?: { id: string } }>(
    "/api/kobble/explorations",
    {
      title: `Card #${String(waiting.number)}: ${waiting.title}`,
      problem: [question, waiting.ask?.about, waiting.url]
        .filter(Boolean)
        .join("\n\n"),
    },
  );
  return made.exploration
    ? `/explore/${encodeURIComponent(made.exploration.id)}`
    : null;
}
