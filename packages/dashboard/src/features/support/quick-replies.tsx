// The quick replies under the kobold's last line; they change at each step.

import { useTranslation } from "react-i18next";

import type { Messages } from "@/i18n/messages";

import { Chips } from "./chips";
import { useCaughtErrors } from "./factory-errors";
import {
  back,
  liveDraft,
  removeTeamData,
  reply,
  say,
  teamBits,
  type Thread,
} from "./tell-kobold";

function Starting({
  line,
  thread,
}: Readonly<{ line: "startBug" | "startWish"; thread: Thread }>) {
  const errors = useCaughtErrors();
  const w = useTranslation().t;
  return (
    <Chips
      choices={w(`feedback.window.starts.${line}.examples`, {
        returnObjects: true,
      })}
      onPick={(choice) => {
        say(choice, thread.page, errors);
      }}
    />
  );
}

type Reply = keyof Messages["feedback"]["window"]["replies"];
const REPLIES: readonly Reply[] = ["askWish", "askBug", "askError"];
const isReply = (line: string): line is Reply =>
  REPLIES.some((one) => one === line);

function Answering({ line }: Readonly<{ line: Reply | "askAgain" }>) {
  const t = useTranslation().t;
  const w = t;
  const choices =
    line === "askAgain"
      ? t("feedback.chat.again", { returnObjects: true })
      : [
          ...w(`feedback.window.replies.${line}`, { returnObjects: true }),
          t("feedback.chat.skip"),
        ];
  return (
    <Chips
      choices={choices}
      onPick={(choice) => {
        reply(choice, choice === t("feedback.chat.skip") ? "" : choice);
      }}
    />
  );
}

function Drafting({ thread }: Readonly<{ thread: Thread }>) {
  const t = useTranslation().t;
  const w = t;
  const draft = liveDraft(thread);
  const marked = (draft?.parts ?? []).some(
    (part) => !part.removed && teamBits(part.text).some((bit) => bit.team),
  );
  return (
    <Chips
      choices={[
        ...(marked ? [w("feedback.window.takeOut")] : []),
        w("feedback.window.addDetail"),
      ]}
      onPick={(choice) => {
        if (choice === w("feedback.window.addDetail"))
          document.getElementById("sprocket-input")?.focus();
        else removeTeamData(t("feedback.chat.taken"));
      }}
    />
  );
}

export function QuickReplies({
  thread,
  say: line,
}: Readonly<{ thread: Thread; say: string }>) {
  const w = useTranslation().t;
  if (line === "startBug" || line === "startWish")
    return <Starting line={line} thread={thread} />;
  if (isReply(line) || line === "askAgain") return <Answering line={line} />;
  if (thread.step === "draft" && liveDraft(thread))
    return <Drafting thread={thread} />;
  if (thread.step === "sent")
    return (
      <Chips
        choices={[w("feedback.window.somethingElse")]}
        onPick={() => {
          back();
        }}
      />
    );
  return null;
}
