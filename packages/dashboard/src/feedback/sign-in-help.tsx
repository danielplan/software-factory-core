// While the person signs in to GitHub: the code to type there; and why a
// send did not work.

import { useSigning } from "./feedback-board";

export function SignInHelp({ problem }: Readonly<{ problem: string | null }>) {
  const signing = useSigning();
  if (signing?.code)
    return (
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Type <b className="tracking-[0.08em] text-foreground">{signing.code}</b>{" "}
        at github.com/login/device, then I send it.
      </p>
    );
  const said = signing?.problem ?? problem;
  return said ? (
    <p role="alert" className="text-[11.5px] leading-relaxed text-destructive">
      {said}
    </p>
  ) : null;
}
