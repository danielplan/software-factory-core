import { useCallback, useLayoutEffect, useRef, useState } from "react";

import type { PartView } from "@/api";
import { cn } from "@/lib/utils";

import { PartCard } from "./part-card";

// The product's parts in layers, top to bottom: what people open, what
// works behind, where data lives. A line joins each part to every part it
// needs, its arrow at the part needed. Pointing at a part lights its lines
// and says, in a sentence, what it needs and what needs it.

type LayerKey = "open" | "behind" | "data";

const LAYERS: { key: LayerKey; title: string; about: string }[] = [
  {
    key: "open",
    title: "What people open",
    about: "The screens people use",
  },
  {
    key: "behind",
    title: "What works behind",
    about: "Servers and pieces the screens rely on",
  },
  {
    key: "data",
    title: "Where data lives",
    about: "Databases and stores, only checked",
  },
];

const DATA_WORDS = /\b(data|database|db|postgres|mysql|sqlite|redis|storage|store|bucket)\b/i;

// A part's layer, worked out from what is known of it: only checked (or
// named as a store) is data; with an Open link is what people open; the
// rest works behind.
function layerOf(part: PartView): LayerKey {
  if (part.start === "never" || DATA_WORDS.test(part.name)) return "data";
  if (part.link) return "open";
  return "behind";
}

// Each layer's parts, ordered under the parts that need them, so the lines
// cross as little as can be.
function layersOf(parts: PartView[]): Record<LayerKey, PartView[]> {
  const layers: Record<LayerKey, PartView[]> = {
    open: [],
    behind: [],
    data: [],
  };
  for (const part of parts) layers[layerOf(part)].push(part);
  const place = new Map<string, number>();
  layers.open.forEach((part, index) => place.set(part.id, index));
  for (const key of ["behind", "data"] as const) {
    const above = (part: PartView) => {
      const at = parts
        .filter((other) => other.dependsOn.includes(part.id))
        .map((other) => place.get(other.id))
        .filter((index): index is number => index !== undefined);
      return at.length === 0
        ? Number.POSITIVE_INFINITY
        : at.reduce((sum, index) => sum + index, 0) / at.length;
    };
    layers[key] = [...layers[key]].sort((a, b) => above(a) - above(b));
    layers[key].forEach((part, index) => place.set(part.id, index));
  }
  return layers;
}

type Line = { from: string; to: string; d: string };

export function LayerMap({
  parts,
  onPress,
}: Readonly<{ parts: PartView[]; onPress: (path: string) => void }>) {
  const layers = layersOf(parts);
  const frame = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pointed, setPointed] = useState<string | null>(null);

  const measure = useCallback(() => {
    const root = frame.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const boxOf = (id: string) => {
      const box = boxes.current.get(id)?.getBoundingClientRect();
      return box
        ? {
            x: box.left - origin.left + box.width / 2,
            top: box.top - origin.top,
            bottom: box.bottom - origin.top,
          }
        : null;
    };
    const found: Line[] = [];
    for (const part of parts) {
      const from = boxOf(part.id);
      if (!from) continue;
      for (const id of part.dependsOn) {
        const to = boxOf(id);
        if (!to) continue;
        found.push({ from: part.id, to: id, d: pathOf(from, to) });
      }
    }
    setLines(found);
    setSize({ width: origin.width, height: origin.height });
  }, [parts]);

  useLayoutEffect(() => {
    measure();
    const root = frame.current;
    if (!root) return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(root);
    for (const box of boxes.current.values()) watcher.observe(box);
    return () => {
      watcher.disconnect();
    };
  }, [measure]);

  const lit = (line: Line) =>
    pointed !== null && (line.from === pointed || line.to === pointed);
  const near = (id: string) =>
    pointed === null ||
    id === pointed ||
    lines.some(
      (line) =>
        (line.from === pointed && line.to === id) ||
        (line.to === pointed && line.from === id),
    );

  return (
    <div className="grid gap-3">
      <div ref={frame} className="relative">
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={size.width}
          height={size.height}
          aria-hidden
        >
          <defs>
            <marker
              id="layer-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M1 1l8 4-8 4" fill="none" stroke="context-stroke" strokeWidth="1.5" />
            </marker>
          </defs>
          {[...lines]
            .sort((a, b) => Number(lit(a)) - Number(lit(b)))
            .map((line) => (
              <path
                key={`${line.from}-${line.to}`}
                d={line.d}
                fill="none"
                strokeWidth={lit(line) ? 2 : 1.5}
                strokeLinecap="round"
                markerEnd="url(#layer-arrow)"
                className={cn(
                  "transition-opacity",
                  lit(line) ? "stroke-primary" : "stroke-arrow",
                  pointed !== null && !lit(line) && "opacity-25",
                )}
              />
            ))}
        </svg>
        <div className="grid">
          {LAYERS.filter(({ key }) => layers[key].length > 0).map(
            (layer, index) => (
              <section
                key={layer.key}
                aria-label={layer.title}
                className={cn(
                  "grid gap-2 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-4",
                  index > 0 && "border-t border-dashed border-border-soft",
                )}
              >
                <div className="self-center">
                  <div className="text-xs font-semibold">{layer.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {layer.about}
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                  {layers[layer.key].map((part) => (
                    <div
                      key={part.id}
                      ref={(box) => {
                        if (box) boxes.current.set(part.id, box);
                        else boxes.current.delete(part.id);
                      }}
                      onMouseEnter={() => {
                        setPointed(part.id);
                      }}
                      onMouseLeave={() => {
                        setPointed(null);
                      }}
                      onFocus={() => {
                        setPointed(part.id);
                      }}
                      onBlur={() => {
                        setPointed(null);
                      }}
                      className={cn(
                        "relative w-56 max-w-full transition-opacity",
                        !near(part.id) && "opacity-40",
                      )}
                    >
                      <PartCard part={part} onPress={onPress} />
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      </div>
      <p className="min-h-5 text-center text-[13px] text-foreground-2">
        {pointed
          ? sentenceOf(pointed, parts)
          : "Point at a part to see what it needs and what needs it."}
      </p>
    </div>
  );
}

// A line from one part to a part it needs: down from its bottom to the
// other's top, up when the other is above, and a loop below both when they
// are side by side.
function pathOf(
  from: { x: number; top: number; bottom: number },
  to: { x: number; top: number; bottom: number },
): string {
  if (to.top >= from.bottom) {
    const middle = (from.bottom + to.top) / 2;
    return `M${from.x} ${from.bottom} C${from.x} ${middle} ${to.x} ${middle} ${to.x} ${to.top - 2}`;
  }
  if (to.bottom <= from.top) {
    const middle = (from.top + to.bottom) / 2;
    return `M${from.x} ${from.top} C${from.x} ${middle} ${to.x} ${middle} ${to.x} ${to.bottom + 2}`;
  }
  const low = Math.max(from.bottom, to.bottom) + 18;
  return `M${from.x} ${from.bottom} C${from.x} ${low} ${to.x} ${low} ${to.x} ${to.bottom + 2}`;
}

// "Shop needs Orders and Database; Back office needs it."
function sentenceOf(id: string, parts: PartView[]): string {
  const part = parts.find((other) => other.id === id);
  if (!part) return "";
  const nameOf = (other: string) =>
    parts.find((each) => each.id === other)?.name ?? other;
  const needs = part.dependsOn.map(nameOf);
  const usedBy = parts
    .filter((other) => other.dependsOn.includes(id))
    .map((other) => other.name);
  const first =
    needs.length === 0
      ? `${part.name} needs no other part`
      : `${part.name} needs ${listOf(needs)}`;
  const second =
    usedBy.length === 0
      ? "nothing needs it."
      : `${listOf(usedBy)} ${usedBy.length === 1 ? "needs" : "need"} it.`;
  return `${first}; ${second}`;
}

function listOf(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}
