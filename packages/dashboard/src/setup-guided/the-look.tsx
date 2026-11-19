// "The look" on How Kobble works: Kobble in the colours and corners of the
// team's own app, or in its own; written on the setup's card "The look",
// which the kobold follows when it writes the theme.

import { messageOf, post, type Card } from "@/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CHOICES = [
  {
    id: "yours",
    name: "Your app’s look",
    text: "Your app’s colours, fonts and corners, taken from its code when Kobble is set up, and your logo.",
    swatches: [],
  },
  {
    id: "kobble",
    name: "Kobble’s own",
    text: "The kobold logo, calm grey and blue.",
    swatches: ["#141824", "#3156d8", "#ecf0ff"],
  },
] satisfies { id: string; name: string; text: string; swatches: string[] }[];

export function isLook(card: Card): boolean {
  return card.title.toLowerCase().startsWith("the look");
}

export function TheLook({
  cards,
  area,
}: Readonly<{ cards: Card[]; area: string }>) {
  const card = cards.find(isLook);
  const now = card?.text?.includes("Kobble’s own") ? "kobble" : "yours";
  const [problem, setProblem] = useState<string | null>(null);
  const choose = (id: string) => {
    const choice = CHOICES.find((c) => c.id === id);
    if (!choice) return;
    const text = `${choice.name}: ${choice.text}`;
    setProblem(null);
    post(
      "/api/setup/draft",
      card
        ? { edit: { id: card.id, text } }
        : { add: { area, title: "The look", text } },
    ).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={now === choice.id}
            className={cn(
              "grid min-w-[220px] flex-1 gap-1.5 rounded-xl bg-card p-4 text-left shadow-card hover:ring-[1.5px] hover:ring-primary",
              now === choice.id && "bg-[#fbfcff] ring-2 ring-primary",
            )}
            onClick={() => {
              choose(choice.id);
            }}
          >
            <span className="flex gap-1.5">
              {choice.swatches.map((color) => (
                <span
                  key={color}
                  className="size-[22px] rounded-[7px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="font-semibold">{choice.name}</span>
            <span className="text-[12.5px] text-muted-foreground">
              {choice.text}
            </span>
          </button>
        ))}
      </div>
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
    </div>
  );
}
