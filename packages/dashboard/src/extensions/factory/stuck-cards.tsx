// Stuck: the cards the builder got stuck on (a question, checks still red
// after three tries, a build it could not finish), above the board, beside
// "Waiting for you". They wait in the board's Backlog, apart from the new
// ideas there. Each says why in one plain line and for how long. The way on
// is helping the builder: answer it or give it a hint (its suggested answers,
// when it asked, are quick picks) and send. The reply goes into the card's
// conversation, and the card goes to To do, where it says "Your hint is with
// the builder". Or ask Sprocket about it first: its conversation opens about
// the card (with the question typed here), it looks at the card and its
// branch, and sends the answer on once agreed.

import {
  ArrowUpRight,
  Check,
  CircleAlert,
  MessageCircleQuestion,
  Play,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { FIELD_AREA } from "@/lib/field-style";
import { askSupport } from "@/lib/ask-support";
import { cn } from "@/lib/utils";

import { reasonOf, type Stuck, stuckFor } from "@/lib/stuck-view";

export const STUCK_COLOUR = "#d9534f";

export function StuckList({ stuck }: Readonly<{ stuck: Stuck[] }>) {
  const t = useTranslation().t;
  // Sent ones leave the list at once; the board's next reading has them in
  // To do.
  const [sent, setSent] = useState<number[]>([]);
  const shown = stuck.filter((one) => !sent.includes(one.number));
  if (shown.length === 0) return null;
  const now = new Date();
  return (
    <section
      aria-label={t("builder.stuck.title")}
      className="grid gap-3 rounded-xl border px-4 py-3.5"
      style={{
        backgroundColor: `color-mix(in srgb, ${STUCK_COLOUR} 5%, #fafafa)`,
        borderColor: `color-mix(in srgb, ${STUCK_COLOUR} 22%, #e6e6ea)`,
      }}
    >
      <h2 className="flex items-center gap-2 text-[13px] font-semibold">
        <CircleAlert
          aria-hidden
          className="size-[15px]"
          style={{ color: STUCK_COLOUR }}
        />
        <span style={{ color: STUCK_COLOUR }}>{t("builder.stuck.title")}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {t("builder.stuck.count", { count: shown.length })}
        </span>
      </h2>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((one) => (
          <StuckCard
            key={one.number}
            one={one}
            now={now}
            onSent={() => {
              setSent((was) => [...was, one.number]);
            }}
          />
        ))}
      </div>
    </section>
  );
}

// One stuck card: number, how long, title, why; then the builder's
// suggested answers, the box and Send.
// The card's number, linked to the card, and how long it has been stuck.
function StuckHead({ one, now }: Readonly<{ one: Stuck; now: Date }>) {
  const t = useTranslation().t;
  return (
    <p className="flex w-full items-center gap-2 text-xs text-muted-foreground">
      <a
        href={one.url}
        target="_blank"
        rel="noreferrer"
        title={t("builder.stuck.seeCard")}
        className="inline-flex items-center gap-0.5 hover:text-foreground"
      >
        #{one.number}
        <ArrowUpRight aria-hidden className="size-3" />
      </a>
      <span className="ml-auto font-medium" style={{ color: STUCK_COLOUR }}>
        {stuckFor(one.since, now, t)}
      </span>
    </p>
  );
}

function StuckCard({
  one,
  now,
  onSent,
}: Readonly<{ one: Stuck; now: Date; onSent: () => void }>) {
  const t = useTranslation().t;
  const [hint, write] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const said = hint.trim();
  // Out of sessions, not stuck on anything: Continue needs no words, a hint
  // goes with it when written.
  const carryOn = one.note === "out-of-sessions";
  const sent = said || (carryOn ? t("builder.stuck.carryOn") : "");
  const label = carryOn ? t("builder.stuck.continue") : t("builder.stuck.send");
  const send = () => {
    setSending(true);
    setProblem(null);
    post("/api/work/answer", { number: one.number, text: sent }).then(
      onSent,
      (error: unknown) => {
        setSending(false);
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 motion-safe:animate-rise">
      <StuckHead one={one} now={now} />
      <p className="text-[13px] leading-[1.35] font-medium">{one.title}</p>
      <div className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
        <CircleAlert
          aria-hidden
          className="mt-px size-3.5 flex-none"
          style={{ color: STUCK_COLOUR }}
        />
        <Markdown text={reasonOf(one, t)} inline />
      </div>
      {one.ask && one.ask.answers.length > 0 && (
        <QuickPicks ask={one.ask} said={said} onPick={write} />
      )}
      <textarea
        aria-label={t("builder.stuck.answerOn", { n: one.number })}
        placeholder={
          carryOn
            ? t("builder.stuck.hintIfAny")
            : t("builder.stuck.placeholder")
        }
        value={hint}
        onChange={(event) => {
          write(event.target.value);
        }}
        rows={2}
        className={cn(FIELD_AREA, "mt-1 resize-y text-xs")}
      />
      {problem && <p className="text-xs text-destructive">{problem}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Button size="pill-sm" disabled={!sent || sending} onClick={send}>
          {carryOn ? (
            <Play aria-hidden className="size-3.5" />
          ) : (
            <Send aria-hidden className="size-3.5" />
          )}
          {sending ? t("builder.stuck.sending") : label}
        </Button>
        <AskSprocket one={one} said={said} empty={write} />
      </div>
    </article>
  );
}

// Sprocket's conversation about the card, with what is typed in the box as
// the question; the box empties.
function AskSprocket({
  one,
  said,
  empty,
}: Readonly<{ one: Stuck; said: string; empty: (text: string) => void }>) {
  const t = useTranslation().t;
  return (
    <Button
      size="pill-sm"
      variant="outline"
      onClick={() => {
        askSupport(
          t("builder.stuck.askAbout", {
            n: one.number,
            title: one.title,
            question: said,
            context: said ? "asked" : undefined,
          }),
        );
        empty("");
      }}
    >
      <MessageCircleQuestion aria-hidden className="size-3.5" />
      {t("builder.stuck.ask")}
    </Button>
  );
}

// The builder's suggested answers, as quick picks that fill the box.
function QuickPicks({
  ask,
  said,
  onPick,
}: Readonly<{
  ask: NonNullable<Stuck["ask"]>;
  said: string;
  onPick: (answer: string) => void;
}>) {
  const t = useTranslation().t;
  return (
    <div
      role="radiogroup"
      aria-label={t("builder.stuck.pick")}
      className="mt-1 grid gap-1"
    >
      {ask.answers.map((pick) => {
        const on = said === pick.answer;
        return (
          <button
            key={pick.key}
            type="button"
            role="radio"
            aria-checked={on}
            title={pick.means || undefined}
            onClick={() => {
              onPick(pick.answer);
            }}
            className={cn(
              "flex items-start gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left text-xs",
              on ? "border-foreground/40 bg-wash" : "border-border",
            )}
          >
            <span className="w-3 font-semibold">{pick.key}</span>
            <span className="flex-1 leading-snug">{pick.answer}</span>
            {ask.suggested === pick.key && !on && (
              <span className="rounded-full bg-panel px-1.5 py-px text-[11px] text-muted-foreground">
                {t("builder.stuck.suggested")}
              </span>
            )}
            {on && <Check aria-hidden className="size-3.5 flex-none" />}
          </button>
        );
      })}
    </div>
  );
}
