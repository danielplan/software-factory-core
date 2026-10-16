// What a tracker add-on reads from the page's request when connecting a
// board: its fields, the label that marks the factory's work, and the
// board's columns as the owner matched them to the factory's stages.

import { Refused } from "../refused.ts";
import { stagesFrom } from "./stages.ts";

// The stages as the owner matched them to the board's columns.
export function stagesOf(body: unknown, columns: string[]) {
  try {
    return stagesFrom(
      (body as Record<string, unknown> | null)?.stages,
      columns,
    );
  } catch (error) {
    throw new Refused(error instanceof Error ? error.message : String(error));
  }
}

// The label that marks the factory's work: "factory" unless the owner
// chose another, or * for all of it.
export function labelOf(body: unknown): string {
  const label = field(body, "label").trim() || "factory";
  if (!/^(\*|[\w .:-]+)$/.test(label))
    throw new Refused(
      `“${label}” cannot be a label: use letters, digits, spaces, . : - or *.`,
    );
  return label;
}

export function field(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : "";
}
