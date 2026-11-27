// What Sprocket and the person have said so far in Sprocket's window, with
// the answer as it is written: the support kobold's conversation, or the
// setup coach's while Kobble is set up. Each persona Sprocket proposes shows
// as its card (persona-card.tsx); the cards of its latest answer with cards
// can be answered from the card, so with several, adding one leaves the
// others' buttons (each card says once its persona is in Personas).

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Markdown } from "@/components/markdown";
import { partsOf, proposalsIn } from "@/lib/persona-proposal";

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
  // Sprocket's latest answer that proposed personas: its cards wait.
  const proposing = messages.findLastIndex(
    (message) => !message.mine && proposalsIn(message.text).length > 0,
  );
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
            onSay={at === proposing && writing == null ? onSay : undefined}
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
  return (
    <div className="grid gap-3 self-stretch">
      {partsOf(text).map((part, at) =>
        "proposal" in part ? (
          <PersonaCard
            key={at}
            proposal={part.proposal}
            onAdd={
              onSay &&
              (() => {
                onSay(t("support.persona.yes", { name: part.proposal.name }));
              })
            }
            onChange={onChange}
          />
        ) : (
          <div key={at} className="self-start">
            <Markdown text={part.text} />
          </div>
        ),
      )}
    </div>
  );
}

// The answer while it is written: each proposal's card once its block is done.
function Written({ text }: Readonly<{ text: string }>) {
  return (
    <>
      {partsOf(text).map((part, at) =>
        "proposal" in part ? (
          <PersonaCard key={at} proposal={part.proposal} />
        ) : (
          <Markdown key={at} text={part.text} />
        ),
      )}
    </>
  );
}
