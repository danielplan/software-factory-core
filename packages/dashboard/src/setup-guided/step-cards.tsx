// A step's cards, as tiles: what the kobold drew in the step's area, each
// a guess until agreed, with a way to take it off and to ask about it. In
// "Who it's for" each person shows the kobold their persona will have, and
// the owner can add a persona of their own.

import { Check, MessageCircle, Plus, X } from "lucide-react";
import { useState } from "react";

import { type Card, faceFrom, messageOf, post } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PEOPLE_AREA } from "./steps";

export function StepCards({
  cards,
  area,
  asked,
  onAsk,
}: Readonly<{
  cards: Card[];
  area: string;
  asked: string[];
  onAsk: (id: string) => void;
}>) {
  const [problem, setProblem] = useState<string | null>(null);
  const people = area === PEOPLE_AREA;
  const remove = (id: string) => {
    post("/api/setup/draft", { remove: id }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Tile
            key={card.id}
            card={card}
            people={people}
            asked={asked.includes(card.id)}
            onAsk={() => {
              onAsk(card.id);
            }}
            onRemove={() => {
              remove(card.id);
            }}
          />
        ))}
        {people && <NewPersona area={area} onProblem={setProblem} />}
      </div>
      {cards.length === 0 && !people && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet: the kobold is still reading, or found nothing for
          this step.
        </p>
      )}
      {problem && <p className="text-sm text-destructive">{problem}</p>}
    </div>
  );
}

function Tile({
  card,
  people,
  asked,
  onAsk,
  onRemove,
}: Readonly<{
  card: Card;
  people: boolean;
  asked: boolean;
  onAsk: () => void;
  onRemove: () => void;
}>) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl bg-card px-4 py-3.5 shadow-card",
        asked && "ring-2 ring-primary",
        card.tone === "question" && "bg-wash",
      )}
    >
      <div className="flex items-start gap-3">
        {people && (
          <PersonaFace
            face={faceFrom({ name: card.title, about: card.text ?? "" })}
            size={40}
          />
        )}
        <span className="min-w-0 flex-1 leading-snug font-semibold">
          {card.title}
        </span>
        <button
          type="button"
          aria-label={`Take off ${card.title}`}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={onRemove}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {card.text && (
        <p className="text-[13.5px] leading-relaxed text-foreground-2">
          {card.text}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 text-xs">
        {card.confirmed ? (
          <span className="inline-flex items-center gap-1 text-[#0d7a6d]">
            <Check className="size-3.5" aria-hidden /> Agreed
          </span>
        ) : (
          <span className="text-muted-foreground">
            {card.tone === "question" ? "A question" : "My guess"}
          </span>
        )}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 font-medium text-primary"
          onClick={onAsk}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {asked ? "Asking about it" : "Ask about it"}
        </button>
      </div>
    </article>
  );
}

// A persona of the owner's own: who they are and what they do and want.
function NewPersona({
  area,
  onProblem,
}: Readonly<{ area: string; onProblem: (problem: string | null) => void }>) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        className="grid min-h-[140px] place-items-center rounded-2xl text-sm text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)] hover:text-foreground"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="grid justify-items-center gap-1">
          <Plus className="size-5" aria-hidden />
          New persona
        </span>
      </button>
    );
  return (
    <PersonaForm
      area={area}
      onProblem={onProblem}
      onDone={() => {
        setOpen(false);
      }}
    />
  );
}

function PersonaForm({
  area,
  onProblem,
  onDone,
}: Readonly<{
  area: string;
  onProblem: (problem: string | null) => void;
  onDone: () => void;
}>) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const add = () => {
    onProblem(null);
    post("/api/setup/draft", { add: { area, title, text } }).then(
      () => {
        onDone();
      },
      (error: unknown) => {
        onProblem(messageOf(error));
      },
    );
  };
  return (
    <form
      className="grid gap-2 rounded-2xl bg-card px-4 py-3.5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <label className="grid gap-1 text-xs text-muted-foreground">
        Who they are
        <input
          className="h-9 rounded-lg bg-ground px-3 text-sm text-foreground outline-none"
          value={title}
          placeholder="A first boat owner"
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        What they do and want
        <textarea
          rows={2}
          className="rounded-lg bg-ground px-3 py-2 text-sm text-foreground outline-none"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="pill-sm" disabled={!title.trim()}>
          Add
        </Button>
        <Button
          type="button"
          size="pill-sm"
          variant="ring"
          onClick={() => {
            onDone();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
