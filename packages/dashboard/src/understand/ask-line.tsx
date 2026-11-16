// The kobold's offer under a story with guessed scenes: Ask drafts a short
// message for two people like the persona, to copy and send.

import { Copy } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { KoboldMark } from "./bits";
import { askWords } from "./view";

export function AskLine({
  story,
  guessed,
  persona,
}: Readonly<{ story: string; guessed: number; persona: string }>) {
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    <div className="grid gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <KoboldMark className="size-6" />
        <span className="flex-1 text-sm">
          {asking
            ? "The kobold is writing a question…"
            : askWords(guessed, persona)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={asking}
          onClick={() => void ask()}
        >
          {question ? "Ask again" : "Ask"}
        </Button>
      </div>
      {question && (
        <div className="grid gap-2 rounded-lg bg-card px-3.5 py-3">
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
