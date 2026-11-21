// The quick replies under the kobold's last line; they change at each step.

import { useT } from "@/i18n/use-t";

import { Chips } from "./chips";
import { useCaughtErrors } from "./factory-errors";
import { REPLIES, START } from "./starts";
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
  return (
    <Chips
      choices={START[line].examples}
      onPick={(choice) => {
        say(choice, thread.page, errors);
      }}
    />
  );
}

function Answering({ line }: Readonly<{ line: string }>) {
  const t = useT().feedback.chat;
  const choices =
    line === "askAgain" ? t.again : [...(REPLIES[line] ?? []), t.skip];
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
  const t = useT().feedback.chat;
  const draft = liveDraft(thread);
  const marked = (draft?.parts ?? []).some(
    (part) => !part.removed && teamBits(part.text).some((bit) => bit.team),
  );
  return (
    <Chips
      choices={[...(marked ? ["Take out my team's data"] : []), "Add a detail"]}
      onPick={(choice) => {
        if (choice === "Add a detail")
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
  if (line === "startBug" || line === "startWish")
    return <Starting line={line} thread={thread} />;
  if (line in REPLIES || line === "askAgain") return <Answering line={line} />;
  if (thread.step === "draft" && liveDraft(thread))
    return <Drafting thread={thread} />;
  if (thread.step === "sent")
    return (
      <Chips
        choices={["Something else"]}
        onPick={() => {
          back();
        }}
      />
    );
  return null;
}
