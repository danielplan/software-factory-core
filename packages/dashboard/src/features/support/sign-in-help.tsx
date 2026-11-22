// While the person signs in to GitHub: the code to type there; and why a
// send did not work.

import { useTranslation } from "react-i18next";

import { useSigning } from "@/api/feedback-board";

export function SignInHelp({ problem }: Readonly<{ problem: string | null }>) {
  const signing = useSigning();
  const w = useTranslation().t;
  if (signing?.code)
    return (
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {w("feedback.window.typeBefore")}{" "}
        <b className="tracking-[0.08em] text-foreground">{signing.code}</b>{" "}
        {w("feedback.window.typeAfter")}
      </p>
    );
  const said = signing?.problem ?? problem;
  return said ? (
    <p role="alert" className="text-[11.5px] leading-relaxed text-destructive">
      {said}
    </p>
  ) : null;
}
