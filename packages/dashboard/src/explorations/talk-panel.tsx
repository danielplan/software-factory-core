// The conversation with the kobold beside the canvas: what was said, its
// reply while it writes, what it is doing, why it could not answer, and a
// box to talk to it. It changes the board while it talks.

import { Mic } from "lucide-react";
import { useState } from "react";

import { type ExplorationPage, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
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
  return (
    <aside className="flex min-h-0 w-[340px] flex-none flex-col border-l border-border bg-card max-lg:w-full max-lg:border-t max-lg:border-l-0">
      <div className="flex items-center gap-2.5 border-b border-border-soft px-4 py-3.5">
        <KoboldHead size={28} />
        <span className="grid">
          <span className="text-sm font-semibold">Your kobold</span>
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
      <div className="border-t border-border-soft p-3">
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
    <form
      className="flex gap-2 border-t border-border-soft p-3"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <input
        aria-label="Talk to the kobold"
        placeholder="Talk to the kobold…"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        className="h-[38px] flex-1 rounded-xl bg-ground px-3 text-[13.5px] outline-none"
      />
      <Button
        type="button"
        size="pill-sm"
        variant="ring"
        aria-label="Talk out loud"
        onClick={() => {
          call.start();
        }}
      >
        <Mic aria-hidden className="size-4" />
      </Button>
      <Button type="submit" size="pill-sm" disabled={busy || !text.trim()}>
        Send
      </Button>
    </form>
  );
}

function Messages({
  page,
  refused,
}: Readonly<{ page: ExplorationPage; refused: string | null }>) {
  const { talk } = page;
  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-auto px-4 py-3.5">
      {talk.messages.map((message, at) =>
        message.from === "kobold" ? (
          <Kobold key={at} text={message.text} />
        ) : (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-[14px_4px_14px_14px] bg-blue px-3 py-[9px] text-[13.5px] leading-[1.45] text-blue-foreground"
          >
            <Markdown text={message.text} />
          </div>
        ),
      )}
      {talk.writing !== null && (
        <Kobold text={talk.writing || talk.activity || "…"} />
      )}
      {(talk.problem ?? refused) && (
        <p role="alert" className="text-[12.5px] text-destructive">
          {talk.problem ?? refused}
        </p>
      )}
    </div>
  );
}

function Kobold({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex gap-2">
      <KoboldHead size={22} />
      <div className="rounded-[4px_14px_14px_14px] bg-ground px-3 py-[9px] text-[13.5px] leading-[1.45]">
        <Markdown text={text} />
      </div>
    </div>
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
    <div className="flex flex-wrap gap-1.5 border-t border-border-soft px-3 pt-2.5">
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
