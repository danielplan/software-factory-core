// The conversation with the kobold beside the canvas, roomy as a chat:
// what was said (the kobold's words as plain text, the person's in a soft
// bubble, the newest in view), its
// reply while it writes, what it is doing, why it could not answer, and a
// box to talk to it. It changes the board while it talks.

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type ExplorationPage, messageOf, post } from "@/api/client";
import { ChatSend } from "@/components/chat-send";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { stopWords } from "@/i18n/server-texts";

import { showsVoice } from "@/lib/voice/call";
import { useVoiceCall } from "@/hooks/voice/use-voice-call";
import { VoiceView } from "@/components/voice/voice-view";

import { nameOf } from "./board/nodes";
import { Who } from "./explorer-header";
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
  return (
    <aside className="flex min-h-0 w-[23rem] flex-none flex-col border-l border-border bg-card max-lg:w-full max-lg:border-t max-lg:border-l-0">
      <Who page={page} />
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
  const stop = () => {
    post("/api/kobble/explorations/stop", { id: page.exploration.id }).catch(
      (error: unknown) => {
        onRefused(messageOf(error));
      },
    );
  };
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
      onStop={stop}
      onTalk={() => {
        call.start();
      }}
    />
  );
}

// The box to type in, roomy: two lines to start, growing with the words, Enter sends and
// Shift+Enter starts a new line; Talk and Send (an arrow) below. While the
// kobold answers, what is sent joins its answer, and Stop ends it.
function TypeBox({
  fresh,
  text,
  onText,
  busy,
  onSend,
  onStop,
  onTalk,
}: Readonly<{
  // A new exploration, waiting for the team's idea.
  fresh: boolean;
  text: string;
  onText: (text: string) => void;
  busy: boolean;
  onSend: () => void;
  onStop: () => void;
  onTalk: () => void;
}>) {
  const t = useTranslation().t;
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
        aria-label={t("explore.talk.talk")}
        placeholder={
          fresh ? t("explore.talk.yourIdea") : t("explore.talk.placeholder")
        }
        rows={2}
        value={text}
        onChange={(event) => {
          onText(event.target.value);
        }}
        onKeyDown={(event) => {
          // Enter sends; Shift+Enter starts a new line.
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          if (text.trim()) onSend();
        }}
        ref={grow}
        className="max-h-48 min-h-11 resize-none overflow-y-auto bg-transparent px-1 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="pill-sm"
          variant="ring"
          aria-label={t("explore.talk.outLoud")}
          onClick={onTalk}
        >
          <Mic aria-hidden className="size-4" />
        </Button>
        <ChatSend
          busy={busy}
          typed={text.trim() !== ""}
          onStop={onStop}
          size="pill-sm"
          className="ml-auto"
        />
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
        <Problem problem={talk.problem} refused={refused} />
      )}
    </div>
  );
}

// Why the kobold could not answer, in the language shown, or why what the
// person did was refused.
function Problem({
  problem,
  refused,
}: Readonly<{ problem: string | null; refused: string | null }>) {
  const t = useTranslation().t;
  const words = problem
    ? stopWords(problem, t)
    : { reason: refused ?? "", how: "" };
  return (
    <p role="alert" className="text-xs text-destructive">
      {problem
        ? [words.reason, words.how].filter(Boolean).join(". ") + "."
        : words.reason}
    </p>
  );
}

// The kobold's answer while it writes, or what it is doing before it does.
function Writing({ talk }: Readonly<{ talk: ExplorationPage["talk"] }>) {
  const t = useTranslation().t;
  if (talk.writing)
    return (
      <div className="max-w-[94%] self-start text-muted-foreground">
        <Markdown text={talk.writing} />
      </div>
    );
  return (
    <p className="flex items-center gap-2 self-start text-[12.5px] text-muted-foreground">
      <span className="size-1.5 rounded-full bg-blue motion-safe:animate-breathe" />
      {talk.activity ?? t("explore.talk.thinking")}
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
  const t = useTranslation().t;
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
            title={t("explore.talk.takeOff")}
          >
            <span className="truncate">{nameOf(thing, t)}</span> ×
          </button>
        ) : null;
      })}
    </div>
  );
}
