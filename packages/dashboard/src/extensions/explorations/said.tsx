// What the kobold said, with the steps it took between its words: each step
// a small grey line where it happened; three or more in a row fold into one
// line ("4 steps") that opens. The server keeps a step in the words as
// `<!-- step: name -->`.

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Markdown } from "@/components/markdown";

const STEP = /<!-- step: ([a-z_]+) -->/;
const FOLDED_FROM = 3;

type Piece = { words: string } | { steps: string[] };

// The words and runs of steps, in order.
export function piecesOf(text: string): Piece[] {
  const pieces: Piece[] = [];
  text.split(STEP).forEach((part, at) => {
    const last = pieces.at(-1);
    if (at % 2 === 1) {
      if (last && "steps" in last) last.steps.push(part);
      else pieces.push({ steps: [part] });
    } else if (part.trim()) pieces.push({ words: part.trim() });
  });
  return pieces;
}

// Whether the text ends with a step (nothing said after it yet).
export function endsWithStep(text: string): boolean {
  const last = piecesOf(text).at(-1);
  return last !== undefined && "steps" in last;
}

export function Said({ text }: Readonly<{ text: string }>) {
  return (
    <div className="grid gap-2">
      {piecesOf(text).map((piece, at) =>
        "words" in piece ? (
          <Markdown key={at} text={piece.words} />
        ) : (
          <Steps key={at} steps={piece.steps} />
        ),
      )}
    </div>
  );
}

function Steps({ steps }: Readonly<{ steps: string[] }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (steps.length < FOLDED_FROM)
    return (
      <ul className="grid gap-0.5">
        {steps.map((step, at) => (
          <Step key={at} step={step} />
        ))}
      </ul>
    );
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="grid gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 self-start text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Chevron className="size-3" aria-hidden />
        {t("explore.steps.count", { count: steps.length })}
      </button>
      {open && (
        <ul className="grid gap-0.5 pl-4">
          {steps.map((step, at) => (
            <Step key={at} step={step} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Step({ step }: Readonly<{ step: string }>) {
  const { t } = useTranslation();
  const words: Record<string, string> = t("explore.steps", {
    returnObjects: true,
  });
  return (
    <li className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span
        className="size-1 rounded-full bg-muted-foreground/60"
        aria-hidden
      />
      {words[step] ?? words["other"]}
    </li>
  );
}
