// How much of a story people confirmed, in a line ("3 of 4 steps
// confirmed · 1 guessed"), and, while steps are guessed, the kobold's
// offer: Ask drafts a short message for two people like this person, to
// copy and send.

import { Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("understand");
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
        <span className="flex-1 text-note text-muted-foreground">
          {asking ? t("ask.writing") : knownWords(known)}
        </span>
        {guessed && canAsk && (
          <Button
            variant="outline"
            size="sm"
            disabled={asking}
            onClick={() => void ask()}
          >
            <KoboldMark className="size-5" />
            {question ? t("ask.again") : t("ask.ask", { name: persona })}
          </Button>
        )}
      </div>
      {question && (
        <div className="grid gap-2 rounded-xl bg-tint px-3.5 py-3">
          <p className="text-body whitespace-pre-wrap">{question}</p>
          <Button
            variant="outline"
            size="xs"
            className="w-fit"
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            {copied ? t("ask.copied") : t("ask.copy")}
          </Button>
        </div>
      )}
      {problem && <ProblemBox title={t("ask.cantDraft")} text={problem} />}
    </div>
  );
}
