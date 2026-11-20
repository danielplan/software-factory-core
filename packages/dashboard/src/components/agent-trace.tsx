// What a kobold did, step by step: its trace, the newest last and in view
// as it happens. Folded away when it is not working, open while it is.

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function AgentTrace({
  steps,
  live,
  title,
}: Readonly<{ steps: string[]; live: boolean; title: string }>) {
  const end = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = end.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [steps.length]);
  if (steps.length === 0) return null;
  return (
    <details open={live} className="nodrag group text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground-2 select-none">
        {live && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-blue opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-blue" />
          </span>
        )}
        {title}
        <span className="font-normal text-muted-foreground">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      </summary>
      <ol
        ref={end}
        className="mt-2 grid max-h-56 gap-1 overflow-y-auto font-mono text-[11.5px] leading-snug text-foreground-2"
      >
        {steps.map((step, at) => (
          <li
            key={`${String(at)}-${step}`}
            className={cn(
              live && at === steps.length - 1 && "font-semibold text-blue",
            )}
          >
            {step}
          </li>
        ))}
      </ol>
    </details>
  );
}
