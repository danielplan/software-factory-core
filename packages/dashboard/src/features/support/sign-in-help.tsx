// While the person signs in to GitHub: the code to type there; and why a
// send did not work.

import { useSigning } from "@/api/feedback-board";
import { useT } from "@/i18n/use-t";

export function SignInHelp({ problem }: Readonly<{ problem: string | null }>) {
  const signing = useSigning();
  const w = useT().feedback.window;
  if (signing?.code)
    return (
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {w.typeBefore}{" "}
        <b className="tracking-[0.08em] text-foreground">{signing.code}</b>{" "}
        {w.typeAfter}
      </p>
    );
  const said = signing?.problem ?? problem;
  return said ? (
    <p role="alert" className="text-[11.5px] leading-relaxed text-destructive">
      {said}
    </p>
  ) : null;
}
