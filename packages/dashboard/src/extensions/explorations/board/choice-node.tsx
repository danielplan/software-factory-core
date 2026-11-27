// A choice on the board: the question and its options. Click one to pick it
// (again to take it back), and the kobold goes on, making its prototype when
// that helps; the one the kobold recommends and those with a prototype say
// so. With its trade-offs (points), the options stand side by side as the
// columns of a table, a row per point and a cell per option; the chosen one
// softly green.

import type { NodeProps } from "@xyflow/react";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { Frame, useBoardDo } from "./frame";
import type { ThingNode } from "./nodes";

type Choice = Extract<ThingNode["data"]["thing"], { kind: "choice" }>;
type Option = Choice["options"][number];
type Shown = {
  thing: Choice;
  made: Set<string>;
  choose: (key: string) => void;
};

const CHOSEN = "bg-[#e3f5ee]";

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
  const choose = (key: string) => {
    act("board", {
      do: {
        act: "choose",
        id: thing.id,
        option: thing.chosen === key ? null : key,
      },
    });
  };
  const shown = { thing, made, choose };
  return (
    <Frame data={data} title={thing.title}>
      {thing.points?.length ? (
        <ChoiceTable {...shown} />
      ) : (
        thing.options.map((option) => (
          <OptionRow key={option.key} option={option} {...shown} />
        ))
      )}
    </Frame>
  );
}

// An option as a row of the list (a choice without points).
function OptionRow({
  option,
  thing,
  made,
  choose,
}: Shown & { option: Option }) {
  const chosen = thing.chosen === option.key;
  return (
    <div
      className={cn(
        "nodrag flex min-w-0 items-center gap-2 rounded-[10px] px-2 py-[7px]",
        chosen ? `${CHOSEN} shadow-[inset_0_0_0_1.5px_#12a594]` : "bg-ground",
      )}
    >
      <button
        type="button"
        aria-pressed={chosen}
        title={option.difference}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => {
          choose(option.key);
        }}
      >
        <Letter option={option} chosen={chosen} />
        <span className="grid min-w-0 flex-1">
          <span className={cn(chosen && "font-semibold")}>{option.name}</span>
          {thing.recommended === option.key && <Recommended />}
        </span>
      </button>
      {made.has(option.key) && <HasPrototype className="flex-none" />}
    </div>
  );
}

function ChoiceTable({ thing, made, choose }: Readonly<Shown>) {
  const tint = (key: string) => thing.chosen === key && CHOSEN;
  return (
    <table className="nodrag w-full table-fixed border-collapse text-[12.5px]">
      <thead>
        <tr>
          <th className="w-[92px]" />
          {thing.options.map((option) => (
            <OptionHead
              key={option.key}
              option={option}
              thing={thing}
              made={made}
              choose={choose}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {(thing.points ?? []).map((point) => (
          <tr key={point.label} className="border-t border-[var(--line-soft)]">
            <th
              scope="row"
              className="py-1.5 pr-2 text-left align-top font-medium text-muted-foreground"
            >
              {point.label}
            </th>
            {thing.options.map((option) => (
              <td
                key={option.key}
                className={cn("px-2 py-1.5 align-top", tint(option.key))}
              >
                {point.cells[option.key] ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// An option as a column's head: a click chooses it, as in the list.
function OptionHead({
  option,
  thing,
  made,
  choose,
}: Shown & { option: Option }) {
  const chosen = thing.chosen === option.key;
  return (
    <th
      className={cn(
        "rounded-t-[10px] p-0 align-top font-normal",
        chosen && CHOSEN,
      )}
    >
      <button
        type="button"
        aria-pressed={chosen}
        title={option.difference}
        className="grid w-full gap-1 px-2 py-[7px] text-left"
        onClick={() => {
          choose(option.key);
        }}
      >
        <span className="flex items-center gap-1.5">
          <Letter option={option} chosen={chosen} />
          <span className={cn("min-w-0", chosen && "font-semibold")}>
            {option.name}
          </span>
        </span>
        {thing.recommended === option.key && <Recommended />}
        {made.has(option.key) && <HasPrototype />}
      </button>
    </th>
  );
}

function Letter({
  option,
  chosen,
}: Readonly<{ option: Option; chosen: boolean }>) {
  return (
    <span
      className={cn(
        "grid size-5 flex-none place-items-center rounded-md text-[11px] font-semibold",
        chosen ? "bg-[#12a594] text-white" : "bg-card text-wash-foreground",
      )}
    >
      {chosen ? <Check aria-hidden className="size-3" /> : option.key}
    </span>
  );
}

function Recommended() {
  const t = useTranslation().t;
  return (
    <span
      title={t("explore.board.recommendsThis")}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-wash-foreground"
    >
      <Sparkles aria-hidden className="size-3 flex-none" />
      {t("explore.board.recommended")}
    </span>
  );
}

function HasPrototype({ className }: Readonly<{ className?: string }>) {
  const t = useTranslation().t;
  return (
    <span
      className={cn("text-[11px] font-medium text-muted-foreground", className)}
    >
      {t("explore.kinds.prototype")}
    </span>
  );
}
