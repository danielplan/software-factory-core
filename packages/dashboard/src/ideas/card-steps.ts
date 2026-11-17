// A builder's or coach's step in a few words, for a card: a command
// becomes "Running a command", a file its name; the full step shows when
// the card is opened.

import { t } from "../i18n/i18n.ts";

const FILE_STEPS = {
  Reading: "build:card.reading",
  Editing: "build:card.editing",
  Writing: "build:card.writing",
} as const;

export function shortStep(step: string): string {
  if (step.startsWith("Running:")) return t("build:card.running");
  const file = /^(Reading|Editing|Writing) (.+)$/.exec(step);
  if (file) {
    const verb = file[1] as keyof typeof FILE_STEPS;
    return t(FILE_STEPS[verb], {
      file: (file[2] ?? "").split("/").at(-1) ?? "",
    });
  }
  return step.length > 48 ? `${step.slice(0, 48)}…` : step;
}
