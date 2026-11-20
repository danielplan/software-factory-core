// The things on the board, drawn in their frame (frame.tsx): the problem
// (a yellow note with its personas), what we heard (its signals with their
// persona's face), a note, a choice (the question and its options: click
// one to pick it, and the kobold goes on, making its prototype when that
// helps; the one the kobold recommends and those with a prototype say so),
// a diagram (drawn
// from Mermaid) and a picture a person put there.

import type { NodeProps } from "@xyflow/react";
import { Check, Sparkles } from "lucide-react";

import { PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { useDiagram } from "./diagram";
import { Frame, useBoardDo } from "./frame";
import type { ThingNode } from "./nodes";

export function ProblemNode({ data }: NodeProps<ThingNode>) {
  const { exploration, personas } = data.page;
  return (
    <Frame data={data} tone="note">
      <div className="text-[13.5px] leading-[1.45]">
        <Markdown
          text={exploration.problem || "The kobold writes the problem here."}
        />
      </div>
      {personas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {personas.map((one) => (
            <span
              key={one.id}
              className="inline-flex h-6 items-center gap-1.5 rounded-full bg-card pr-2.5 pl-1 text-xs font-medium shadow-[inset_0_0_0_1px_var(--line-soft)]"
            >
              <PersonaFace face={one.face} size={18} />
              {one.name}
            </span>
          ))}
        </div>
      )}
    </Frame>
  );
}

export function HeardNode({ data }: NodeProps<ThingNode>) {
  return (
    <Frame data={data}>
      {data.page.heard.map((signal) => (
        <div
          key={signal.id}
          className="flex gap-2 border-t border-border-soft pt-1.5 text-[12.5px] first-of-type:border-t-0 first-of-type:pt-0"
        >
          {signal.personaFace && (
            <PersonaFace face={signal.personaFace} size={18} />
          )}
          <span className="flex-1">
            <Markdown text={signal.text} inline />
          </span>
        </div>
      ))}
    </Frame>
  );
}

export function NoteNode({ data }: NodeProps<ThingNode>) {
  const { thing } = data;
  if (thing.kind !== "note") return null;
  return (
    <Frame data={data} tone="note">
      <Markdown text={thing.text} />
    </Frame>
  );
}

export function ChoiceNode({ data }: NodeProps<ThingNode>) {
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  if (thing.kind !== "choice") return null;
  // This choice's options that have a prototype: the variants of the
  // prototypes its arrows lead to, or (older boards) the arrows' labels.
  const made = new Set(
    page.board.links.flatMap((link) => {
      if (link.from !== thing.id) return [];
      const to = page.board.things.find((one) => one.id === link.to);
      if (to?.kind !== "prototype") return [];
      return to.variants?.map((one) => one.key) ?? [link.label];
    }),
  );
  return (
    <Frame data={data} title={thing.title}>
      {thing.options.map((option) => {
        const chosen = thing.chosen === option.key;
        return (
          <div
            key={option.key}
            className={cn(
              "nodrag flex min-w-0 items-center gap-2 rounded-[10px] px-2 py-[7px]",
              chosen
                ? "bg-[#e3f5ee] shadow-[inset_0_0_0_1.5px_#12a594]"
                : "bg-ground",
            )}
          >
            <button
              type="button"
              aria-pressed={chosen}
              title={option.difference}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => {
                act("board", {
                  do: {
                    act: "choose",
                    id: thing.id,
                    option: chosen ? null : option.key,
                  },
                });
              }}
            >
              <span
                className={cn(
                  "grid size-5 flex-none place-items-center rounded-md text-[11px] font-semibold",
                  chosen
                    ? "bg-[#12a594] text-white"
                    : "bg-card text-wash-foreground",
                )}
              >
                {chosen ? <Check aria-hidden className="size-3" /> : option.key}
              </span>
              <span className="grid min-w-0 flex-1">
                <span className={cn(chosen && "font-semibold")}>
                  {option.name}
                </span>
                {thing.recommended === option.key && (
                  <span
                    title="The kobold recommends this one"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-wash-foreground"
                  >
                    <Sparkles aria-hidden className="size-3 flex-none" />
                    Recommended
                  </span>
                )}
              </span>
            </button>
            {made.has(option.key) && (
              <span className="flex-none text-[11px] font-medium text-muted-foreground">
                Prototype
              </span>
            )}
          </div>
        );
      })}
    </Frame>
  );
}

export function DiagramNode({ data }: NodeProps<ThingNode>) {
  const { thing } = data;
  const text = thing.kind === "diagram" ? thing.diagram : "";
  const { svg, problem } = useDiagram(text);
  if (thing.kind !== "diagram") return null;
  return (
    <Frame data={data} title={thing.title}>
      {svg && (
        <div
          role="img"
          aria-label={thing.title}
          className="nodrag grid place-items-center overflow-hidden [&_svg]:h-auto [&_svg]:max-w-full"
          // Mermaid's strict mode cleans the picture (diagram.ts).
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {!svg && !problem && (
        <div className="h-32 animate-pulse rounded-lg bg-ground" />
      )}
      {problem && (
        <pre className="nodrag rounded-md bg-ground p-2 text-xs whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </Frame>
  );
}

export function PictureNode({ data }: NodeProps<ThingNode>) {
  const { thing, page } = data;
  if (thing.kind !== "picture") return null;
  const address = `/api/kobble/explorations/picture?id=${encodeURIComponent(page.exploration.id)}&name=${encodeURIComponent(thing.image)}`;
  return (
    <Frame data={data} title={thing.title}>
      <img
        src={address}
        alt={thing.title}
        className="nodrag max-h-[360px] w-full rounded-lg object-contain shadow-[0_0_0_1px_var(--line-soft)]"
      />
    </Frame>
  );
}
