import { ArrowUp, Mic } from "lucide-react";
import { useState } from "react";

import type { CoachView } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceCall } from "@/voice/use-voice-call";
import type { VoiceCall } from "@/voice/voice-call";
import { VoiceView } from "@/voice/voice-view";

// Where the owner answers: the box to type in, with Talk beside it; during
// a call, the voice in its place.
export function Answer({
  call,
  coach,
  onSay,
  placeholder = "Answer the coach…",
  className,
}: Readonly<{
  call: VoiceCall;
  // Whether it is answering, and why it could not.
  coach: Pick<CoachView, "working" | "problem">;
  onSay: (text: string) => void;
  placeholder?: string;
  className?: string;
}>) {
  const talking = useVoiceCall(call).phase !== "off";
  if (talking)
    return (
      <VoiceView
        call={call}
        coachProblem={coach.problem}
        onEnd={() => {
          call.end();
        }}
      />
    );
  return (
    <Reply
      working={coach.working}
      placeholder={placeholder}
      className={className}
      onSay={onSay}
      onTalk={() => {
        call.start();
      }}
    />
  );
}

function Reply({
  working,
  placeholder,
  className,
  onSay,
  onTalk,
}: Readonly<{
  working: boolean;
  placeholder: string;
  className: string | undefined;
  onSay: (text: string) => void;
  onTalk: () => void;
}>) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || working) return;
    onSay(text.trim());
    setText("");
  };
  return (
    <form
      className={cn(
        "flex items-end gap-2 rounded-[18px] bg-surface p-2 pl-4",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor="coach-reply" className="sr-only">
        Answer the coach
      </label>
      <textarea
        id="coach-reply"
        rows={2}
        value={text}
        autoFocus
        placeholder={placeholder}
        className="min-h-11 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          send();
        }}
      />
      <IconAction label="Talk" title="Talk instead of typing" onClick={onTalk}>
        <Mic aria-hidden />
      </IconAction>
      <Button
        type="submit"
        size="icon"
        aria-label="Send"
        className="size-10 rounded-full"
        disabled={working || !text.trim()}
      >
        <ArrowUp aria-hidden />
      </Button>
    </form>
  );
}

// A round button with only an icon, beside the box.
function IconAction({
  label,
  title,
  onClick,
  children,
}: Readonly<{
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={title}
      className="size-10 rounded-full"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
