// How much of a story is seen, in a line ("3 of 4 parts seen · 1
// guessed"), and, while parts are guessed, the kobold's offer: Ask drafts a
// short message for two people like the persona, to copy and send.

import { Copy } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { KoboldMark } from "./bits";
import { knownWords } from "./view";

export function AskLine({
  story,
  known,
  persona,
  canAsk,
}: Readonly<{
  story: string;
  known: { seen: number; of: number };
  persona: string;
  canAsk: boolean;
}>) {
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const guessed = known.of > known.seen;
  const ask = async () => {
    setAsking(true);
    setProblem(null);
    try {
      const answer = await post<{ question: string }>("/api/understand/ask", {
        story,
      });
      setQuestion(answer.question);
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setAsking(false);
    }
  };
  const copy = async () => {
    if (!question) return;
    await navigator.clipboard.writeText(question);
    setCopied(true);
  };
  return (
    <div className="grid gap-2.5 border-t border-border-soft pt-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-[13px] text-muted-foreground">
          {asking ? "The kobold is writing a question…" : knownWords(known)}
        </span>
        {guessed && canAsk && (
          <Button
            variant="outline"
            size="sm"
            disabled={asking}
            onClick={() => void ask()}
          >
            <KoboldMark className="size-5" />
            {question ? "Ask again" : `Ask two people like ${persona}`}
          </Button>
        )}
      </div>
      {question && (
        <div className="grid gap-2 rounded-xl bg-tint px-3.5 py-3">
          <p className="text-sm whitespace-pre-wrap">{question}</p>
          <Button
            variant="outline"
            size="xs"
            className="w-fit"
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            {copied ? "Copied" : "Copy to send"}
          </Button>
        </div>
      )}
      {problem && (
        <ProblemBox title="The kobold could not draft it" text={problem} />
      )}
    </div>
  );
}
