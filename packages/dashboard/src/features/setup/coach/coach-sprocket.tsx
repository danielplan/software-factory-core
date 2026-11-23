// Sprocket while Kobble is set up: the same bar at the bottom as on every
// page (components/layout/sprocket-dock.tsx), here for the setup coach. The
// bar says what Sprocket does, in plain words, while it works; opened, the
// window holds what the owner and Sprocket said, and the box to answer in
// (or Talk). ⌘J opens and closes it, Escape closes it.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CoachView } from "@/api/client";
import { ProblemBox } from "@/components/layout/problem-box";
import {
  SprocketBar,
  SprocketDock,
  SprocketHead,
} from "@/components/layout/sprocket-dock";
import { Messages } from "@/components/layout/sprocket-messages";
import { useKoboldName } from "@/lib/brand";
import type { VoiceCall } from "@/lib/voice/voice-call";

import { statusOf } from "../steps";
import { Answer } from "./answer-box";
import { useSay } from "./coach-chat";

export function CoachSprocket({
  coach,
  call,
}: Readonly<{ coach: CoachView; call: VoiceCall }>) {
  const t = useTranslation().t;
  const name = useKoboldName();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        setOpen((was) => !was);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
    };
  }, []);
  const { say } = useSay([], () => undefined);
  const status = statusOf(coach);
  const doing = status ? t(`setup.status.${status}`) : null;
  return (
    <SprocketDock open={open}>
      {open ? (
        <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise">
          <SprocketHead
            onClose={() => {
              setOpen(false);
            }}
          />
          <Messages
            messages={coach.messages.map((message) => ({
              mine: message.from === "owner",
              text: message.text,
            }))}
            writing={coach.working ? (coach.writing ?? "") : null}
            status={doing ?? ""}
            onSay={say}
          />
          <Box coach={coach} call={call} />
        </div>
      ) : (
        <SprocketBar
          working={coach.working}
          line={doing ?? t("support.ask", { name })}
          onOpen={() => {
            setOpen(true);
          }}
        />
      )}
    </SprocketDock>
  );
}

// The box to answer Sprocket in, and why it could not answer, if so.
function Box({ coach, call }: Readonly<{ coach: CoachView; call: VoiceCall }>) {
  const t = useTranslation().t;
  const { say, problem } = useSay([], () => undefined);
  return (
    <div className="grid flex-none gap-2 px-4 pt-2 pb-4">
      {problem && (
        <ProblemBox title={t("setup.coach.couldNot")} text={problem} />
      )}
      <Answer call={call} coach={coach} onSay={say} />
    </div>
  );
}
