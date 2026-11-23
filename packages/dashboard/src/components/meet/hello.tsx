// PROTOTYPE, "Meet the kobolds", variant B: the first time a kobold shows up
// (Tinker on its card, Bolt on a card), it says in a small bubble who it is
// and what it is doing for you. "Got it" and it never says it again.

import { Check } from "lucide-react";

import { KoboldHead } from "@/components/kobold-face";

import { meet, memberOf, useMet, VARIANT } from "./meet";

export function Hello({
  id,
  now,
}: Readonly<{
  id: string;
  // What it is doing right now, when the card says it elsewhere.
  now?: string | null;
}>) {
  const met = useMet(id);
  if (VARIANT !== "B" || met) return null;
  const member = memberOf(id);
  return (
    <div
      role="status"
      className="relative mt-1.5 grid w-full min-w-0 gap-1.5 rounded-lg border border-blue/25 bg-card px-2.5 py-2 text-left shadow-card motion-safe:animate-pop"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <span
        aria-hidden
        className="absolute -top-[5px] left-4 size-2.5 rotate-45 border-t border-l border-blue/25 bg-card"
      />
      <div className="flex min-w-0 items-start gap-2">
        <KoboldHead
          size={28}
          hat={member.hat}
          color={member.color}
          className="mt-0.5 motion-safe:animate-bob"
        />
        <p className="min-w-0 text-xs leading-snug break-words text-foreground">
          <span className="font-semibold">Hi, I'm {member.name}.</span>{" "}
          {member.hello}{" "}
          <span className="text-muted-foreground">{member.meanwhile}</span>
          {now ? <span className="text-blue"> Now: {now}</span> : null}
        </p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          meet(id);
        }}
        className="inline-flex h-6 items-center gap-1 justify-self-end rounded-full px-2.5 text-xs font-medium text-blue hover:bg-blue/8 [&_svg]:size-3"
      >
        <Check aria-hidden /> Got it
      </button>
    </div>
  );
}
