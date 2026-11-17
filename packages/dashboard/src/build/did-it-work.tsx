// "Did it work?" for an idea's card that is in the app: the card and what
// it was for (the problems, and what the team thought), a draft of what
// was seen since, which the kobold fills in when it can and the person
// keeps or changes, and three answers: yes, the problem is solved; no; or
// nobody checked. The answer is saved in the records and on the issue.

import { useEffect, useState } from "react";

import {
  type Answered,
  messageOf,
  post,
  type SeenDraft,
  type TicketView,
} from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KoboldMark } from "@/understand/bits";

import { t } from "../i18n/i18n.ts";
import { TicketFor } from "./ticket-bits";
import { seenNote, ticketLine } from "./view";

type Worked = Answered["outcome"]["worked"];

export function DidItWork({
  ticket,
  title,
  onClose,
  onAnswered,
}: Readonly<{
  ticket: TicketView;
  title: string;
  onClose: () => void;
  onAnswered: (answered: Answered) => void;
}>) {
  const { draft, seen, setSeen } = useSeenDraft(ticket.issue);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const answer = async (worked: Worked) => {
    setSending(true);
    setProblem(null);
    try {
      onAnswered(
        await post<Answered>("/api/build/answer", {
          issue: ticket.issue,
          worked,
          seen,
        }),
      );
    } catch (error) {
      setProblem(messageOf(error));
      setSending(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("build:didItWork.title")}</DialogTitle>
          <DialogDescription>{ticketLine(ticket, title)}</DialogDescription>
        </DialogHeader>
        <TicketFor ticket={ticket} />
        {ticket.idea && (
          <p className="text-body">
            <span className="text-muted-foreground">
              {t("build:didItWork.weThink")}{" "}
            </span>
            {ticket.idea.weThink}
          </p>
        )}
        <SeenBox seen={seen} note={seenNote(draft)} onChange={setSeen} />
        {problem && (
          <ProblemBox title={t("build:didItWork.problem")} text={problem} />
        )}
        <Answers
          sending={sending}
          onAnswer={(worked) => void answer(worked)}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

// What was seen, the kobold's draft to start from, and a line on where it
// comes from.
function SeenBox({
  seen,
  note,
  onChange,
}: Readonly<{ seen: string; note: string; onChange: (seen: string) => void }>) {
  return (
    <div className="grid gap-1.5 rounded-xl bg-muted/60 p-3">
      <div className="flex gap-2.5">
        <KoboldMark className="size-6" />
        <textarea
          aria-label={t("build:didItWork.seen")}
          value={seen}
          rows={3}
          placeholder={t("build:didItWork.seenHint")}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="w-full rounded-[10px] border border-input bg-card px-3 py-2 text-body outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      <p className="text-tag text-muted-foreground" role="status">
        {note}
      </p>
    </div>
  );
}

const ANSWERS = [
  { worked: "yes", words: "build:didItWork.yes" },
  { worked: "no", words: "build:didItWork.no" },
  { worked: "unchecked", words: "build:didItWork.unchecked" },
] as const;

function Answers({
  sending,
  onAnswer,
  onCancel,
}: Readonly<{
  sending: boolean;
  onAnswer: (worked: Worked) => void;
  onCancel: () => void;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ANSWERS.map(({ worked, words }) => (
        <Button
          key={worked}
          variant={worked === "yes" ? "default" : "outline"}
          disabled={sending}
          onClick={() => {
            onAnswer(worked);
          }}
        >
          {t(words)}
        </Button>
      ))}
      <Button variant="ghost" className="ml-auto" onClick={onCancel}>
        {t("build:didItWork.cancel")}
      </Button>
    </div>
  );
}

// The kobold's draft of what was seen, asked for once: it fills the text
// unless the person already wrote something.
function useSeenDraft(issue: number) {
  const [draft, setDraft] = useState<SeenDraft | null>(null);
  const [seen, setSeen] = useState("");
  useEffect(() => {
    let current = true;
    post<SeenDraft>("/api/build/draft", { issue }).then(
      (drafted) => {
        if (!current) return;
        setDraft(drafted);
        setSeen((typed) => typed || drafted.draft);
      },
      (error: unknown) => {
        if (current)
          setDraft({ draft: "", heard: 0, problem: messageOf(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [issue]);
  return { draft, seen, setSeen };
}
