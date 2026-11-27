// The things on the board, drawn in their frame (frame.tsx): the problem
// (a yellow note with its personas), what we heard (its signals with their
// persona's face), a note, a choice (the question and its options: click
// one to pick it; choice-node.tsx),
// a diagram (drawn
// from Mermaid) and a picture a person put there.

import type { NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { PersonaFace } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";

import { useDiagram } from "./diagram";
import { Frame } from "./frame";
import type { ThingNode } from "./nodes";

export function ProblemNode({ data }: NodeProps<ThingNode>) {
  const t = useTranslation().t;
  const { exploration, personas } = data.page;
  return (
    <Frame data={data} tone="note">
      <div className="text-[13.5px] leading-[1.45]">
        <Markdown
          text={exploration.problem || t("explore.board.problemHere")}
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
