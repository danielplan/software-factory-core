// What a kobold did, step by step: its trace, as in a terminal (dark, in a
// fixed-width font), each step with an icon for the kind of thing it did,
// the newest last, in view and lit while it works.

import {
  BookOpen,
  CircleCheck,
  CircleX,
  FilePen,
  FlaskConical,
  GitBranch,
  Globe,
  ListTodo,
  type LucideIcon,
  MessageSquare,
  Package,
  Play,
  Search,
  ShieldCheck,
  SquareTerminal,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// The kind of a step, from its first words, with its icon and colour.
const KINDS: [RegExp, LucideIcon, string][] = [
  [/^Getting started/, Play, "text-[#7dd3fc]"],
  [/^(Editing|Writing)/, FilePen, "text-[#fbbf24]"],
  [/^Reading/, BookOpen, "text-[#a5b4fc]"],
  [/^(Searching|Looking for files|Looking through)/, Search, "text-[#a5b4fc]"],
  [/^Running the tests/, FlaskConical, "text-[#86efac]"],
  [/^Checking/, ShieldCheck, "text-[#86efac]"],
  [/^Working with git/, GitBranch, "text-[#f9a8d4]"],
  [/^Installing/, Package, "text-[#fdba74]"],
  [/^(Running|Building)/, SquareTerminal, "text-[#e5e7eb]"],
  [/^Asking a helper/, Users, "text-[#c4b5fd]"],
  [/^Looking up/, Globe, "text-[#7dd3fc]"],
  [/^Updating its to-do/, ListTodo, "text-[#9ca3af]"],
  [/^Using/, Wrench, "text-[#9ca3af]"],
  [/^Finished/, CircleCheck, "text-[#86efac]"],
  [/^Stopped/, CircleX, "text-[#fca5a5]"],
];

function kindOf(step: string): { Icon: LucideIcon; tint: string } {
  const found = KINDS.find(([pattern]) => pattern.test(step));
  return found
    ? { Icon: found[1], tint: found[2] }
    : { Icon: MessageSquare, tint: "text-[#9ca3af]" };
}

export function AgentTrace({
  steps,
  live,
}: Readonly<{ steps: string[]; live: boolean }>) {
  const end = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = end.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [steps.length]);
  return (
    <div className="overflow-hidden rounded-xl bg-[#0f1117] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
        {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
          <span
            key={dot}
            className="size-2.5 rounded-full"
            style={{ background: dot }}
          />
        ))}
        <span className="ml-2 font-mono text-[11px] text-[#6b7280]">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
          {live ? " · live" : ""}
        </span>
      </div>
      <ol
        ref={end}
        className="grid max-h-[60vh] gap-1 overflow-y-auto px-3 py-2.5 font-mono text-[12px] leading-snug text-[#d1d5db]"
      >
        {steps.length === 0 && <li className="text-[#6b7280]">Nothing yet.</li>}
        {steps.map((step, at) => {
          const { Icon, tint } = kindOf(step);
          const last = live && at === steps.length - 1;
          return (
            <li
              key={`${String(at)}-${step}`}
              className={cn("flex gap-2", last && "text-white")}
            >
              <Icon
                aria-hidden
                className={cn("mt-[2px] size-3.5 flex-none", tint)}
              />
              <span className="min-w-0 break-words">
                {step}
                {last && (
                  <span className="ml-1 inline-block h-3 w-1.5 translate-y-[1px] bg-[#d1d5db] motion-safe:animate-pulse" />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
