// What Sprocket and the person have said so far in Sprocket's window, with
// the answer as it is written: the support kobold's conversation, or the
// setup coach's while Kobble is set up. What Sprocket proposes (a persona,
// a mission) shows as a proposal card (proposals.tsx); while it is the last
// thing said, the person answers it from the card.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Markdown } from "@/components/markdown";
import { partsOf } from "@/lib/proposal-blocks";

import { type Answer, Proposal, yesTo } from "./proposals";

export type Said = { mine: boolean; text: string };

export function Messages({
  messages,
  writing,
  status,
  onSay,
}: Readonly<{
  messages: Said[];
  // The answer so far; "" before its first words; null when not answering.
  writing: string | null;
  // What Sprocket does before its first words, in plain words.
  status: string;
  // Says something to Sprocket for the person (a card's answer).
  onSay?: (text: string) => void;
}>) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count, writing]);
  // The box to answer in, next to the messages.
  const focusAnswer = () => {
    end.current?.parentElement?.parentElement
      ?.querySelector("textarea")
      ?.focus();
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 py-3 text-[13px] leading-relaxed">
      {messages.map((message, at) =>
        message.mine ? (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-lg bg-surface px-3 py-1.5"
          >
            {message.text}
          </div>
        ) : (
          <SprocketSaid
            key={at}
            text={message.text}
            next={messages[at + 1]?.text}
            onSay={at === count - 1 && writing == null ? onSay : undefined}
            onChange={focusAnswer}
          />
        ),
      )}
      {writing != null && (
        <div className="grid gap-3 self-stretch text-muted-foreground">
          {writing ? <Written text={writing} /> : status}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

function SprocketSaid({
  text,
  next,
  onSay,
  onChange,
}: Readonly<{
  text: string;
  // What the person said after it, if anything.
  next: string | undefined;
  onSay: ((text: string) => void) | undefined;
  onChange: () => void;
}>) {
  const t = useTranslation().t;
  const parts = partsOf(text);
  const { block } = parts;
  const answer = ((): Answer => {
    if (onSay) return { state: "waiting", onSay, onChange };
    if (!block || next === undefined) return { state: "shown" };
    return { state: "answered", yes: next === yesTo(block, t) };
  })();
  return (
    <div className="grid gap-3 self-stretch">
      {parts.before && (
        <div className="self-start">
          <Markdown text={parts.before} />
        </div>
      )}
      {block && <Proposal block={block} answer={answer} />}
      {parts.after && (
        <div className="self-start">
          <Markdown text={parts.after} />
        </div>
      )}
    </div>
  );
}

// The answer while it is written: a proposal's card once its block is done.
function Written({ text }: Readonly<{ text: string }>) {
  const parts = partsOf(text);
  return (
    <>
      {parts.before && <Markdown text={parts.before} />}
      {parts.block && (
        <Proposal block={parts.block} answer={{ state: "shown" }} />
      )}
      {parts.after && <Markdown text={parts.after} />}
    </>
  );
}
