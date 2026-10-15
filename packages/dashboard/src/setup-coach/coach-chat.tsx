import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type CoachView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CoachOrb } from "./coach-orb";
import { Said } from "./said";

// Ways to answer the first question with one press.
const STARTERS = [
  "We have code already",
  "We're starting something new",
  "Just show me around",
];

// The conversation with the setup coach: its orb and what it is doing, what
// was said, the reply being written, and the owner's answer.
export function CoachChat({ coach }: Readonly<{ coach: CoachView }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const say = (text: string) => {
    setProblem(null);
    post("/api/setup/say", { text }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  const status = coach.activity ?? (coach.working ? "Thinking…" : "Listening");
  return (
    <aside
      aria-label="The coach"
      className="flex h-[640px] max-h-[80vh] min-w-0 flex-[1_1_340px] flex-col gap-4 rounded-3xl bg-card p-5 lg:max-w-[440px]"
    >
      <div className="flex items-center gap-3">
        <CoachOrb working={coach.working} />
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">The coach</span>
          <span
            aria-live="polite"
            className="truncate text-xs text-muted-foreground"
          >
            {status}
          </span>
        </span>
      </div>
      <Conversation coach={coach} />
      {coach.messages.length === 1 && !coach.working && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => {
                say(starter);
              }}
              className="min-h-9 rounded-full border border-border bg-card px-3.5 text-[13px] hover:border-foreground/40"
            >
              {starter}
            </button>
          ))}
        </div>
      )}
      {(coach.problem ?? problem) && (
        <ProblemBox
          title="The coach could not answer"
          text={coach.problem ?? problem ?? ""}
        />
      )}
      <Reply working={coach.working} onSay={say} />
    </aside>
  );
}

function Conversation({ coach }: Readonly<{ coach: CoachView }>) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [coach.messages.length, coach.writing, coach.activity]);
  return (
    <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
      {coach.messages.map((message, index) => (
        <Bubble key={index} mine={message.from === "owner"}>
          <Said text={message.text} />
        </Bubble>
      ))}
      {coach.working && (
        <Bubble mine={false}>
          {coach.writing ? <Said text={coach.writing} /> : <Dots />}
        </Bubble>
      )}
      <div ref={end} />
    </div>
  );
}

function Bubble({
  mine,
  children,
}: Readonly<{ mine: boolean; children: React.ReactNode }>) {
  return (
    <div className={cn("flex animate-pop", mine && "justify-end")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]",
          mine ? "bg-primary text-primary-foreground" : "bg-surface-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-1 py-1.5" aria-label="Writing">
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-breathe rounded-full bg-muted-foreground"
          style={{ animationDelay: `${String(delay)}ms` }}
        />
      ))}
    </span>
  );
}

// The owner's answer: Enter sends it, Shift+Enter starts a new line.
function Reply({
  working,
  onSay,
}: Readonly<{ working: boolean; onSay: (text: string) => void }>) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || working) return;
    onSay(text.trim());
    setText("");
  };
  return (
    <form
      className="flex items-end gap-2 rounded-[18px] bg-surface p-2 pl-4"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor="coach-reply" className="sr-only">
        Answer the coach
      </label>
      <textarea
        id="coach-reply"
        rows={2}
        value={text}
        autoFocus
        placeholder="Answer, or paste a folder with your code…"
        className="min-h-11 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          send();
        }}
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send"
        className="size-10 rounded-full"
        disabled={working || !text.trim()}
      >
        <ArrowUp aria-hidden />
      </Button>
    </form>
  );
}
