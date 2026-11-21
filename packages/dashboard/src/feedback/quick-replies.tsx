// The quick replies under the kobold's last line; they change at each step.

import { useT } from "@/i18n/use-t";

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
  const w = useT().feedback.window;
  return (
    <Chips
      choices={w.starts[line].examples}
      onPick={(choice) => {
        say(choice, thread.page, errors);
      }}
    />
  );
}

type Reply = keyof ReturnType<typeof useT>["feedback"]["window"]["replies"];
const REPLIES: readonly Reply[] = ["askWish", "askBug", "askError"];
const isReply = (line: string): line is Reply =>
  REPLIES.some((one) => one === line);

function Answering({ line }: Readonly<{ line: Reply | "askAgain" }>) {
  const { chat: t, window: w } = useT().feedback;
  const choices = line === "askAgain" ? t.again : [...w.replies[line], t.skip];
  return (
    <Chips
      choices={choices}
      onPick={(choice) => {
        reply(choice, choice === t.skip ? "" : choice);
      }}
    />
  );
}

function Drafting({ thread }: Readonly<{ thread: Thread }>) {
  const { chat: t, window: w } = useT().feedback;
  const draft = liveDraft(thread);
  const marked = (draft?.parts ?? []).some(
    (part) => !part.removed && teamBits(part.text).some((bit) => bit.team),
  );
  return (
    <Chips
      choices={[...(marked ? [w.takeOut] : []), w.addDetail]}
      onPick={(choice) => {
        if (choice === w.addDetail)
          document.getElementById("sprocket-input")?.focus();
        else removeTeamData(t.taken);
      }}
    />
  );
}

export function QuickReplies({
  thread,
  say: line,
}: Readonly<{ thread: Thread; say: string }>) {
  const w = useT().feedback.window;
  if (line === "startBug" || line === "startWish")
    return <Starting line={line} thread={thread} />;
  if (isReply(line) || line === "askAgain") return <Answering line={line} />;
  if (thread.step === "draft" && liveDraft(thread))
    return <Drafting thread={thread} />;
  if (thread.step === "sent")
    return (
      <Chips
        choices={[w.somethingElse]}
        onPick={() => {
          back();
        }}
      />
    );
  return null;
}
