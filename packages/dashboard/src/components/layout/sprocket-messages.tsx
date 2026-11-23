// What Sprocket and the person have said so far in Sprocket's window, with
// the answer as it is written: the support kobold's conversation, or the
// setup coach's while Kobble is set up. A persona Sprocket proposes shows as
// its card (persona-card.tsx); while it is the last thing said, the person
// can answer it from the card.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Markdown } from "@/components/markdown";
import { partsOf } from "@/lib/persona-proposal";

import { PersonaCard } from "./persona-card";

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
  onSay,
  onChange,
}: Readonly<{
  text: string;
  onSay: ((text: string) => void) | undefined;
  onChange: () => void;
}>) {
  const t = useTranslation().t;
  const parts = partsOf(text);
  const { proposal } = parts;
  return (
    <div className="grid gap-3 self-stretch">
      {parts.before && (
        <div className="self-start">
          <Markdown text={parts.before} />
        </div>
      )}
      {proposal && (
        <PersonaCard
          proposal={proposal}
          onAdd={
            onSay &&
            (() => {
              onSay(t("support.persona.yes", { name: proposal.name }));
            })
          }
          onChange={onChange}
        />
      )}
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
      {parts.proposal && <PersonaCard proposal={parts.proposal} />}
      {parts.after && <Markdown text={parts.after} />}
    </>
  );
}
