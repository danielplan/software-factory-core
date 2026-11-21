// Small pieces of the chat: the quick replies as chips, and the kobold
// thinking.

import { KoboldHead } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

export function Chips({
  choices,
  onPick,
  align = "end",
}: Readonly<{
  choices: string[];
  onPick: (choice: string) => void;
  align?: "start" | "end";
}>) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {choices.map((choice, at) => (
        <button
          key={choice}
          type="button"
          onClick={() => {
            onPick(choice);
          }}
          style={{ animationDelay: `${String(at * 60)}ms` }}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] text-foreground-2 transition-colors hover:border-[#c7cbfb] hover:bg-[#8b8ff0]/8 motion-safe:animate-rise"
        >
          {choice}
        </button>
      ))}
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-2 self-start text-muted-foreground motion-safe:animate-rise">
      <KoboldHead size={18} className="motion-safe:animate-bob" />
      <span className="flex gap-1">
        {[0, 1, 2].map((at) => (
          <span
            key={at}
            className="size-1.5 rounded-full bg-current motion-safe:animate-breathe"
            style={{ animationDelay: `${String(at * 0.2)}s` }}
          />
        ))}
      </span>
    </div>
  );
}
