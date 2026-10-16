import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type CoachView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { cn } from "@/lib/utils";

import type { VoiceCall } from "@/voice/voice-call";

import { Answer } from "./answer-box";
import { CoachOrb } from "./coach-orb";
import { Said } from "./said";

type Attached = { id: string; name: string };

// Sending the owner's words to the coach, with the pieces of the canvas
// they are about; why it failed, if it did.
function useSay(attached: Attached[], onSent: () => void) {
  const [problem, setProblem] = useState<string | null>(null);
  const say = (text: string) => {
    setProblem(null);
    onSent();
    post("/api/setup/say", { text: text + aboutLine(attached) }).catch(
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  return { say, problem };
}

// Before the first answer: nothing but a box to answer the coach's first
// question in (or Talk), in the middle of the page. Once the owner answers,
// the conversation docks at the side (CoachChat).
export function CoachStart({
  coach,
  call,
}: Readonly<{ coach: CoachView; call: VoiceCall }>) {
  const { say, problem } = useSay([], () => undefined);
  return (
    <section
      aria-label="The coach"
      className="grid w-full max-w-[640px] animate-pop gap-3"
    >
      <Answer
        call={call}
        coach={coach}
        onSay={say}
        placeholder="What do you want to build?"
        className="glow-ring p-3 pl-5 text-base shadow-big"
      />
      {problem && (
        <ProblemBox title="The coach could not answer" text={problem} />
      )}
    </section>
  );
}

// The conversation with the setup coach: what was said, what it is doing
// and writing now, then whatever the page adds (the button that makes the
// factory), and the owner's answer, with the pieces of the canvas it is
// about.
export function CoachChat({
  className,
  coach,
  call,
  attached,
  onUnpick,
  onSent,
  children,
}: Readonly<{
  className?: string;
  coach: CoachView;
  call: VoiceCall;
  attached: Attached[];
  onUnpick: (id: string) => void;
  onSent: () => void;
  children?: React.ReactNode;
}>) {
  const { say, problem } = useSay(attached, onSent);
  return (
    <aside
      aria-label="The coach"
      className={cn(
        "glow-card flex min-h-0 min-w-0 animate-dock flex-col gap-4 rounded-3xl p-5 shadow-big",
        className,
      )}
    >
      <Conversation coach={coach} />
      {(coach.problem ?? problem) && (
        <ProblemBox
          title="The coach could not answer"
          text={coach.problem ?? problem ?? ""}
        />
      )}
      {children}
      <AttachedChips attached={attached} onUnpick={onUnpick} />
      <Answer call={call} coach={coach} onSay={say} />
    </aside>
  );
}

// The end of the owner's message naming the pieces it is about, with their
// ids for the coach.
export function aboutLine(attached: Attached[]): string {
  if (attached.length === 0) return "";
  const named = attached.map((a) => a.name + " [" + a.id + "]");
  return `\n\n(About: ${named.join(", ")})`;
}

// The pieces of the canvas the next message is about, each to take off.
function AttachedChips({
  attached,
  onUnpick,
}: Readonly<{ attached: Attached[]; onUnpick: (id: string) => void }>) {
  if (attached.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="About">
      {attached.map((a) => (
        <span
          key={a.id}
          className="flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-1 pl-2.5 text-xs"
        >
          About: {a.name}
          <button
            type="button"
            aria-label={`Not about ${a.name}`}
            className="flex size-5 items-center justify-center rounded-full hover:bg-card [&_svg]:size-3"
            onClick={() => {
              onUnpick(a.id);
            }}
          >
            <X aria-hidden />
          </button>
        </span>
      ))}
    </div>
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
      {coach.working && <AtWork coach={coach} />}
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

// While the coach works: its orb turning, with what it is doing (or the
// reply as it is written) beside it.
function AtWork({ coach }: Readonly<{ coach: CoachView }>) {
  return (
    <div className="flex animate-pop items-start gap-2.5">
      <CoachOrb working />
      <div
        aria-live="polite"
        className="max-w-[88%] min-w-0 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]"
      >
        {coach.writing ? (
          <Said text={coach.writing} />
        ) : (
          <span className="text-muted-foreground">
            {coach.activity ?? "Thinking…"}
          </span>
        )}
      </div>
    </div>
  );
}
