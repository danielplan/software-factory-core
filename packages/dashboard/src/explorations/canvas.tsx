// The exploration's canvas, laid out left to right on a dotted ground: the
// problem (a yellow note, with its personas) and what we heard; the choice
// (the question and its options A, B, C, with Make for an option without a
// prototype) and the notes; one card per prototype. Arrows join them,
// measured after layout; the agreed prototype's arrow is green.

import { useLayoutEffect, useRef, useState } from "react";

import type { ExplorationPage } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { type Arrow, arrowsOf, type Box } from "./arrows";
import { Badge } from "./bits";
import { PrototypeCard } from "./prototype-card";

const NOTE =
  "rounded-[14px] bg-[#fffbea] px-3.5 py-3 shadow-[0_0_0_1px_#f1e3a6]";
const CARD = "rounded-[14px] bg-card px-3.5 py-3 shadow-card";
const LABEL = "mb-1.5 text-[12.5px] text-muted-foreground";

type Press = (path: string, body: object) => void;

function useArrows(page: ExplorationPage) {
  const canvas = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  useLayoutEffect(() => {
    const ground = canvas.current;
    if (!ground) return;
    const measure = () => {
      const base = ground.getBoundingClientRect();
      const box = (element: Element): Box => {
        const r = element.getBoundingClientRect();
        return {
          left: r.left - base.left,
          right: r.right - base.left,
          top: r.top - base.top,
          height: r.height,
        };
      };
      const one = (name: string) => {
        const found = ground.querySelector(`[data-box="${name}"]`);
        return found ? box(found) : null;
      };
      const all = (name: string) => [
        ...ground.querySelectorAll<HTMLElement>(`[data-box="${name}"]`),
      ];
      setArrows(
        arrowsOf({
          problem: one("problem"),
          choice: one("choice"),
          options: Object.fromEntries(
            all("option").map((e) => [e.dataset.key ?? "", box(e)]),
          ),
          prototypes: Object.fromEntries(
            all("prototype").map((e) => [
              e.dataset.key ?? "",
              { box: box(e), agreed: e.dataset.agreed === "1" },
            ]),
          ),
        }),
      );
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(ground);
    return () => {
      watch.disconnect();
    };
  }, [page]);
  return { canvas, arrows };
}

export function Canvas({
  page,
  press,
}: Readonly<{ page: ExplorationPage; press: Press }>) {
  const { canvas, arrows } = useArrows(page);
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#f7f8fa] bg-[radial-gradient(#dde1ea_1px,transparent_1px)] bg-size-[16px_16px]">
      <div ref={canvas} className="relative flex w-max items-start gap-14 p-6">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <marker
              id="ah"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 8 4 0 8z" fill="#b6bccb" />
            </marker>
          </defs>
          {arrows.map((arrow) => (
            <path
              key={arrow.d}
              d={arrow.d}
              stroke={arrow.agreed ? "#12a594" : "#b6bccb"}
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#ah)"
            />
          ))}
        </svg>
        <div className="flex w-[230px] flex-col gap-4">
          <Problem page={page} />
          <Heard page={page} />
        </div>
        <div className="flex w-[240px] flex-col gap-4">
          <Choice page={page} press={press} />
          {page.board.notes.map((note) => (
            <div key={note} className={cn(NOTE, "text-[13px]")}>
              {note}
            </div>
          ))}
        </div>
        <div className="flex w-[230px] flex-col gap-4">
          {page.board.prototypes.map((made) => (
            <PrototypeCard
              key={made.key}
              page={page}
              made={made}
              press={press}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Problem({ page }: Readonly<{ page: ExplorationPage }>) {
  return (
    <div data-box="problem" className={NOTE}>
      <div className="mb-1 text-[12.5px] text-muted-foreground">
        The problem
      </div>
      <div className="text-[13.5px] leading-[1.45]">
        {page.exploration.problem}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {page.personas.map((one) => (
          <span
            key={one.id}
            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-card pr-2.5 pl-1 text-xs font-medium shadow-[inset_0_0_0_1px_var(--line-soft)]"
          >
            <PersonaFace face={one.face} size={18} />
            {one.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Heard({ page }: Readonly<{ page: ExplorationPage }>) {
  if (page.heard.length === 0) return null;
  return (
    <div className={CARD}>
      <div className={LABEL}>What we heard</div>
      {page.heard.map((signal) => (
        <div
          key={signal.id}
          className="flex gap-2 border-t border-border-soft py-1 text-[12.5px] first-of-type:border-t-0"
        >
          {signal.personaFace && (
            <PersonaFace face={signal.personaFace} size={18} />
          )}
          <span className="flex-1">{signal.text}</span>
        </div>
      ))}
    </div>
  );
}

function Choice({
  page,
  press,
}: Readonly<{ page: ExplorationPage; press: Press }>) {
  const { board, exploration } = page;
  const open = ["waiting", "exploring"].includes(exploration.status);
  const agreed = board.prototypes.find((one) => one.agreed)?.key;
  return (
    <div data-box="choice" className={CARD}>
      <div className="mb-2 flex items-center">
        <span className="flex-1 text-[12.5px] text-muted-foreground">
          Choice
        </span>
        <Badge agreed={agreed !== undefined} />
      </div>
      <div className="mb-2 text-[13.5px] font-semibold">
        {board.question || "The kobold puts the question here."}
      </div>
      {board.options.map((option) => {
        const has = board.prototypes.some((one) => one.key === option.key);
        return (
          <div
            key={option.key}
            data-box="option"
            data-key={option.key}
            className={cn(
              "mt-1 flex items-center gap-2 rounded-[10px] px-2 py-[7px] text-[13px]",
              agreed === option.key ? "bg-[#e3f5ee]" : "bg-ground",
            )}
          >
            <span className="grid size-5 flex-none place-items-center rounded-md bg-card text-[11px] font-semibold text-wash-foreground">
              {option.key}
            </span>
            <span className="flex-1" title={option.difference}>
              {option.name}
            </span>
            {!has && open && (
              <button
                type="button"
                className="text-xs font-semibold text-blue"
                onClick={() => {
                  press("make", { key: option.key });
                }}
              >
                Make
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
