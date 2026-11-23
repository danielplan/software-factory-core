// Under a field of a form: why what was typed cannot be sent
// (lib/forms.ts), once something was typed.

import { useTranslation } from "react-i18next";

import { problemOf } from "@/lib/forms";

export function FieldProblem({
  id,
  field,
}: Readonly<{ id: string; field: Parameters<typeof problemOf>[0] }>) {
  const t = useTranslation().t;
  const problem = problemOf(field);
  if (!problem) return null;
  return (
    <span id={id} role="alert" className="text-xs text-destructive">
      {t(problem)}
    </span>
  );
}
