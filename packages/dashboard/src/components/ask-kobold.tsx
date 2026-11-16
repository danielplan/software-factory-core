// Ask the kobold, at the top of every page: a question about the people
// who use the product, answered from the records (read only), in a small
// panel under the field. ⌘K (Ctrl+K) goes to the field; Enter asks.

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { askPlaceholder, isAskShortcut } from "@/lib/shell-view";
import { KoboldMark } from "@/understand/bits";

type Asked = {
  question: string;
  answer: string | null;
  problem: string | null;
};

export function AskKobold({ product }: Readonly<{ product?: string }>) {
  const field = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<Asked | null>(null);
  useEffect(() => {
    const go = (event: KeyboardEvent) => {
      if (!isAskShortcut(event)) return;
      event.preventDefault();
      field.current?.focus();
    };
    window.addEventListener("keydown", go);
    return () => {
      window.removeEventListener("keydown", go);
    };
  }, []);
  const asking = asked !== null && !asked.answer && !asked.problem;
  const ask = async () => {
    const text = question.trim();
    if (!text || asking) return;
    setAsked({ question: text, answer: null, problem: null });
    try {
      const { answer } = await post<{ answer: string }>(
        "/api/understand/question",
        { question: text },
      );
      setAsked({ question: text, answer, problem: null });
    } catch (error) {
      setAsked({ question: text, answer: null, problem: messageOf(error) });
    }
  };
  return (
    <div className="relative max-w-[520px] min-w-0 flex-[1_1_300px]">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
        className="flex h-10 items-center gap-2.5 rounded-xl bg-tint pr-3 pl-1.5 shadow-[inset_0_0_0_1px_var(--tint-line)] focus-within:shadow-[inset_0_0_0_1px_var(--ring)]"
      >
        <KoboldMark />
        <input
          ref={field}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setAsked(null);
          }}
          aria-label="Ask the kobold"
          placeholder={askPlaceholder(product)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-tint-foreground"
        />
        <kbd className="rounded-[5px] bg-card px-1.5 font-sans text-[11px] text-muted-foreground shadow-[0_0_0_1px_var(--border)] max-sm:hidden">
          ⌘K
        </kbd>
      </form>
      {asked && (
        <Answer
          asked={asked}
          onClose={() => {
            setAsked(null);
          }}
        />
      )}
    </div>
  );
}

// The question, and the kobold's answer, or what it is doing, or why it
// could not answer.
function Answer({
  asked,
  onClose,
}: Readonly<{ asked: Asked; onClose: () => void }>) {
  return (
    <section
      aria-label="The kobold's answer"
      aria-live="polite"
      className="absolute inset-x-0 top-12 z-40 grid gap-2 rounded-2xl bg-popover p-4 shadow-[0_0_0_1px_var(--border),var(--shadow-big)]"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[13px] font-semibold">{asked.question}</p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close the answer"
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex items-start gap-2.5">
        <KoboldMark
          className={asked.answer || asked.problem ? "" : "animate-breathe"}
        />
        <p className="flex-1 pt-1 text-sm whitespace-pre-wrap">
          {asked.answer ??
            asked.problem ??
            "The kobold is reading the records…"}
        </p>
      </div>
    </section>
  );
}
