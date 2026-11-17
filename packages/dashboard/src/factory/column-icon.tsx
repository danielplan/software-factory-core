// The small round icon of a column on the Factory board: an empty ring for
// To do, half full for Building, three quarters for Review, a green tick
// for Done.

import type { FactoryView } from "@/api";

type Column = FactoryView["columns"][number]["id"];

const COLOURS: Record<Column, string> = {
  todo: "#9a9fad",
  building: "#3156d8",
  review: "#7a4fd0",
  done: "#12a594",
};

export function ColumnIcon({ column }: Readonly<{ column: Column }>) {
  const colour = COLOURS[column];
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      aria-hidden
      className="flex-none"
    >
      {column === "done" ? (
        <>
          <circle cx="8" cy="8" r="7" fill={colour} />
          <path
            d="m5 8.2 2 2 4-4.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke={colour}
            strokeWidth="1.5"
          />
          {column === "building" && (
            <path d="M8 4.5 A3.5 3.5 0 0 1 8 11.5 Z" fill={colour} />
          )}
          {column === "review" && (
            <path d="M8 8 L8 4.5 A3.5 3.5 0 1 1 4.5 8 Z" fill={colour} />
          )}
        </>
      )}
    </svg>
  );
}
