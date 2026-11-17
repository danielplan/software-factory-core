// The conversation with the kobold beside the canvas: what was said, its
// reply while it writes, what it is doing, why it could not answer, and a
// box to talk to it. It changes the board while it talks.

import { useState } from "react";

import { type ExplorationPage, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";

import { nameOf } from "./board/nodes";

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
  const [text, setText] = useState("");
  const [refused, setRefused] = useState<string | null>(null);
  const open = ["waiting", "exploring"].includes(exploration.status);
  const busy = page.talk.writing !== null;
  const send = () => {
    setRefused(null);
    post("/api/kobble/explorations/say", {
      id: exploration.id,
      text,
      attached,
    }).then(
      () => {
        setText("");
        onSent();
      },
      (error: unknown) => {
        setRefused(messageOf(error));
      },
    );
  };
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
          <Button type="submit" size="pill-sm" disabled={busy || !text.trim()}>
            Send
          </Button>
        </form>
      )}
    </aside>
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
            {message.text}
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
      <div className="rounded-[4px_14px_14px_14px] bg-ground px-3 py-[9px] text-[13.5px] leading-[1.45] whitespace-pre-wrap">
        {text}
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
