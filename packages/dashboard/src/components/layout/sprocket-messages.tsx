// What Sprocket and the person have said so far in Sprocket's window, with
// the answer as it is written: the support kobold's conversation, or the
// setup coach's while Kobble is set up.

import { useEffect, useRef } from "react";

import { Markdown } from "@/components/markdown";

export type Said = { mine: boolean; text: string };

export function Messages({
  messages,
  writing,
  status,
}: Readonly<{
  messages: Said[];
  // The answer so far; "" before its first words; null when not answering.
  writing: string | null;
  // What Sprocket does before its first words, in plain words.
  status: string;
}>) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count, writing]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 py-3 text-[13px] leading-relaxed">
      {messages.map((message, at) =>
        message.mine ? (
          <div
            key={at}
            className="max-w-[85%] self-end rounded-lg bg-surface px-3 py-1.5"
          >
            {message.text}
          </div>
        ) : (
          <div key={at} className="self-start">
            <Markdown text={message.text} />
          </div>
        ),
      )}
      {writing != null && (
        <div className="self-start text-muted-foreground">
          {writing ? <Markdown text={writing} /> : status}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
