// What Sprocket and the person have said so far in the window, with the
// answer as it is written.

import { useEffect, useRef } from "react";

import { Markdown } from "@/components/markdown";
import { useT } from "@/i18n/use-t";
import type { SupportView } from "./use-support";

export function Messages({
  support,
}: Readonly<{ support: SupportView | null }>) {
  const t = useT();
  const end = useRef<HTMLDivElement>(null);
  const count = support?.messages.length ?? 0;
  const writing = support?.writing;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count, writing]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 py-3 text-[13px] leading-relaxed">
      {support?.messages.map((message, at) =>
        message.from === "kobold" ? (
          <div key={at} className="self-start">
            <Markdown text={message.text} />
          </div>
        ) : (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-lg bg-surface px-3 py-1.5"
          >
            {message.text}
          </div>
        ),
      )}
      {writing != null && (
        <div className="self-start text-muted-foreground">
          {writing ? (
            <Markdown text={writing} />
          ) : (
            (support?.activity ?? t.support.thinking)
          )}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
