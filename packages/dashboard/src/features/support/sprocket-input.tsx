// The bottom of Sprocket's window: a question's feed and the input.

import { useTranslation } from "react-i18next";

import { post } from "@/api/client";
import { ChatSend } from "@/components/chat-send";

import type { Page } from "@/lib/routes";
import { useSupport } from "./use-support";

import { useCaughtErrors } from "./factory-errors";
import { Chips, Thinking } from "./kobold-chat";
import { Messages } from "./support-messages";
import { askMode, looksLikeFeedback, say, type Thread } from "./tell-kobold";

// A question: the support kobold's own conversation.
export function AskFeed({
  thread,
  page,
}: Readonly<{ thread: Thread; page: Page }>) {
  const support = useSupport();
  const startAsk = useTranslation().t;
  const asked = (support?.messages.length ?? 0) > 0 || support?.writing != null;
  if (asked) return <Messages support={support} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 px-4 pt-3 pb-2 text-[13px]">
      {thread.thinking ? (
        <Thinking />
      ) : (
        thread.lines.length > 0 && (
          <>
            <p className="self-start motion-safe:animate-rise">
              {startAsk("feedback.window.starts.startAsk.line")}
            </p>
            <Chips
              choices={startAsk("feedback.window.starts.startAsk.examples", {
                returnObjects: true,
              })}
              onPick={(text) => {
                void post("/api/kobble/support", { text, page }).catch(
                  () => undefined,
                );
              }}
            />
          </>
        )
      )}
    </div>
  );
}

export function Input({
  page,
  thread,
  text,
  onText,
}: Readonly<{
  page: Page;
  thread: Thread;
  text: string;
  onText: (text: string) => void;
}>) {
  const t = useTranslation().t;
  const errors = useCaughtErrors();
  const where = t(`shell.pages.${page}`);
  const support = useSupport();
  const send = () => {
    const said = text.trim();
    if (!said) return;
    onText("");
    const question =
      thread.step === "ask" ||
      (thread.step === "choose" && !looksLikeFeedback(said));
    if (question) {
      if (thread.step !== "ask") askMode(where, false);
      void post("/api/kobble/support", { text: said, page }).catch(
        () => undefined,
      );
      return;
    }
    say(said, where, errors);
  };
  const placeholder = t(`feedback.window.placeholders.${thread.step}`);
  return (
    <form
      className="mx-4 mt-2 mb-4 flex flex-none items-end gap-2 rounded-xl border border-border bg-card p-1.5 transition-colors focus-within:border-[#c7cbfb]"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        id="sprocket-input"
        autoFocus
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          onText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
      />
      <ChatSend
        busy={support?.writing != null}
        typed={text.trim() !== ""}
        onStop={() => {
          void post("/api/kobble/support/stop", {}).catch(() => undefined);
        }}
        size="icon-sm"
        label={t("feedback.window.sendMessage")}
      />
    </form>
  );
}
