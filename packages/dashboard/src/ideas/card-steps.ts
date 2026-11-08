// A builder's or coach's step in a few words, for a card: a command
// becomes "Running a command", a file its name; the full step shows when
// the card is opened.
export function shortStep(step: string): string {
  if (step.startsWith("Running:")) return "Running a command";
  const file = /^(Reading|Editing|Writing) (.+)$/.exec(step);
  if (file)
    return `${file[1] ?? ""} ${(file[2] ?? "").split("/").at(-1) ?? ""}`;
  return step.length > 48 ? `${step.slice(0, 48)}…` : step;
}
