// The conversation with the kobold beside the canvas, roomy as a chat:
// what was said (the kobold's words as plain text, the person's in a soft
// bubble, the newest in view), its
// reply while it writes, what it is doing, why it could not answer, and a
// box to talk to it. It changes the board while it talks.

import { ArrowUp, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ExplorationPage, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { KOBOLDS } from "@/lib/kobolds";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";

import { showsVoice } from "@/voice/call";
import { useVoiceCall } from "@/voice/use-voice-call";
import { VoiceView } from "@/voice/voice-view";

import { nameOf } from "./board/nodes";
import { useKoboldCall } from "./kobold-call";

export function TalkPanel({
  page,
  attached,
  onSent,
  onDetach,
}: Readonly<{
  page: ExplorationPage;
  attached: string[];
  onSent: () => void;
  onDetach: (thing: string) => void;
}>) {
  const { exploration } = page;
  const [refused, setRefused] = useState<string | null>(null);
  const open = ["waiting", "exploring"].includes(exploration.status);
  // The explorer kobold, with the hat of its job.
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  return (
    <aside className="flex min-h-0 w-[23rem] flex-none flex-col border-l border-border bg-card max-lg:w-full max-lg:border-t max-lg:border-l-0">
      <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4">
        <KoboldHead size={28} hat={explorer?.hat} color={explorer?.color} />
        <span className="grid">
          <span className="text-[13px] font-semibold">{explorer?.name}</span>
          <span className="text-xs text-muted-foreground">
            Thinks it through with you and draws on the board
          </span>
        </span>
      </div>
      <Messages page={page} refused={refused} />
      {open && attached.length > 0 && (
        <Attached page={page} attached={attached} onDetach={onDetach} />
      )}
      {open && (
        <TalkBox
          page={page}
          attached={attached}
          onSent={onSent}
          onRefused={setRefused}
        />
      )}
    </aside>
  );
}

// Where the person talks to the kobold: a box to type in with Send and
// Talk; during a call, the voice in its place.
function TalkBox({
  page,
  attached,
  onSent,
  onRefused,
}: Readonly<{
  page: ExplorationPage;
  attached: string[];
  onSent: () => void;
  onRefused: (problem: string | null) => void;
}>) {
  const [text, setText] = useState("");
  const call = useKoboldCall(page, attached, onSent);
  const talking = showsVoice(useVoiceCall(call));
  const busy = page.talk.writing !== null;
  if (talking)
    return (
      <div className="border-t border-border-soft p-4">
        <VoiceView
          call={call}
          coachProblem={page.talk.problem}
          onEnd={() => {
            call.end();
          }}
        />
      </div>
    );
  const send = () => {
    onRefused(null);
    post("/api/kobble/explorations/say", {
      id: page.exploration.id,
      text,
      attached,
    }).then(
      () => {
        setText("");
        onSent();
      },
      (error: unknown) => {
        onRefused(messageOf(error));
      },
    );
  };
  return (
    <TypeBox
      fresh={!page.exploration.problem}
      text={text}
      onText={setText}
      busy={busy}
      onSend={send}
      onTalk={() => {
        call.start();
      }}
    />
  );
}

// The box to type in, roomy: two lines to start, growing with the words, Enter sends and
// Shift+Enter starts a new line; Talk and Send (an arrow) below.
function TypeBox({
  fresh,
  text,
  onText,
  busy,
  onSend,
  onTalk,
}: Readonly<{
  // A new exploration, waiting for the team's idea.
  fresh: boolean;
  text: string;
  onText: (text: string) => void;
  busy: boolean;
  onSend: () => void;
  onTalk: () => void;
}>) {
  // It grows with the words, up to about eight lines, and shrinks when sent.
  const grow = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const box = grow.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${String(box.scrollHeight)}px`;
  }, [text]);
  return (
    <form
      className="mx-4 mb-4 grid gap-2 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(20_24_36/0.05)] focus-within:ring-2 focus-within:ring-blue/25"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <textarea
        aria-label="Talk to the kobold"
        placeholder={fresh ? "What's your idea?" : "Talk to the kobold…"}
        rows={2}
        value={text}
        onChange={(event) => {
          onText(event.target.value);
        }}
        onKeyDown={(event) => {
          // Enter sends; Shift+Enter starts a new line.
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          if (!busy && text.trim()) onSend();
        }}
        ref={grow}
        className="max-h-48 min-h-11 resize-none overflow-y-auto bg-transparent px-1 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="pill-sm"
          variant="ring"
          aria-label="Talk out loud"
          onClick={onTalk}
        >
          <Mic aria-hidden className="size-4" />
        </Button>
        <Button
          type="submit"
          size="pill-sm"
          aria-label="Send"
          className="ml-auto"
          disabled={busy || !text.trim()}
        >
          <ArrowUp aria-hidden className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function Messages({
  page,
  refused,
}: Readonly<{ page: ExplorationPage; refused: string | null }>) {
  const { talk } = page;
  // The newest words are in view: at the end when it opens, and again when
  // something is said or the kobold writes.
  const end = useRef<HTMLDivElement>(null);
  const said = talk.messages.length;
  const writing = talk.writing?.length ?? 0;
  useEffect(() => {
    const box = end.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [said, writing]);
  return (
    <div
      ref={end}
      className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4 text-[12.5px] leading-relaxed"
    >
      {talk.messages.map((message, at) =>
        message.from === "kobold" ? (
          <div key={at} className="max-w-[94%] self-start">
            <Markdown text={message.text} />
          </div>
        ) : (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-xl rounded-br-md bg-wash px-3 py-1.5 text-foreground"
          >
            <Markdown text={message.text} />
          </div>
        ),
      )}
      {talk.writing !== null && <Writing talk={talk} />}
      {(talk.problem ?? refused) && (
        <p role="alert" className="text-xs text-destructive">
          {talk.problem ?? refused}
        </p>
      )}
    </div>
  );
}

// The kobold's answer while it writes, or what it is doing before it does.
function Writing({ talk }: Readonly<{ talk: ExplorationPage["talk"] }>) {
  if (talk.writing)
    return (
      <div className="max-w-[94%] self-start text-muted-foreground">
        <Markdown text={talk.writing} />
      </div>
    );
  return (
    <p className="flex items-center gap-2 self-start text-[12.5px] text-muted-foreground">
      <span className="size-1.5 rounded-full bg-blue motion-safe:animate-breathe" />
      {talk.activity ?? "Thinking…"}
    </p>
  );
}

// The things attached to what is typed next, each with a way to take it off.
function Attached({
  page,
  attached,
  onDetach,
}: Readonly<{
  page: ExplorationPage;
  attached: string[];
  onDetach: (thing: string) => void;
}>) {
  return (
    <div className="flex flex-wrap gap-1.5 px-5 pb-2">
      {attached.map((id) => {
        const thing = page.board.things.find((one) => one.id === id);
        return thing ? (
          <button
            key={id}
            type="button"
            onClick={() => {
              onDetach(id);
            }}
            className="inline-flex h-6 max-w-[200px] items-center gap-1 rounded-full bg-wash px-2.5 text-xs text-wash-foreground"
            title="Take it off"
          >
            <span className="truncate">{nameOf(thing)}</span> ×
          </button>
        ) : null;
      })}
    </div>
  );
}
