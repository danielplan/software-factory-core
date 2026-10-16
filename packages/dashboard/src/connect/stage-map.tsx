import { stageOf } from "@/ideas/stages";

import { Pick } from "./pick";

export type StageMap = Record<
  "backlog" | "todo" | "building" | "trying" | "done",
  string
>;
export type Columns = { columns: string[]; suggested: StageMap };

// The factory's stages, with their colours on the board.
const ROWS = [
  { id: "backlog", status: "ready" },
  { id: "todo", status: "todo" },
  { id: "building", status: "building" },
  { id: "trying", status: "trying" },
  { id: "done", status: "done" },
] as const;

const NONE = "-";

// Which of the board's columns each of the factory's stages is: suggested
// from the columns' names, each to change.
export function StageMapping({
  columns,
  value,
  onChange,
}: Readonly<{
  columns: string[];
  value: StageMap;
  onChange: (value: StageMap) => void;
}>) {
  const options = [
    { value: NONE, label: "Not on this board" },
    ...columns.map((column) => ({ value: column, label: column })),
  ];
  return (
    <div className="grid gap-2.5 rounded-2xl bg-surface-2/60 p-4">
      <span className="text-sm font-medium">Which column is which</span>
      <span className="text-xs text-muted-foreground">
        Matched from the columns' names; change any that is wrong.
      </span>
      {ROWS.map((row) => {
        const stage = stageOf(row.status);
        return (
          <div
            key={row.id}
            className="grid items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <span className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: stage.colour }}
              />
              {stage.title}
            </span>
            <Pick
              label={`Column for ${stage.title}`}
              value={value[row.id] || NONE}
              options={options}
              onPick={(picked) => {
                onChange({ ...value, [row.id]: picked === NONE ? "" : picked });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
