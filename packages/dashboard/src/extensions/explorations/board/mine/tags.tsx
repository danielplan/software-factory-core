// The small tags on the team's own things: "Yours", in the person's colour,
// and "Taken in" once Doodle has acted on it.

import { Check, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

// The "Yours" tag, in the person's colour.
export function YoursTag() {
  const t = useTranslation().t;
  return (
    <span
      title={t("explore.board.mine.yoursHint")}
      className="inline-flex h-5 flex-none items-center gap-1 rounded-full bg-blue px-1.5 font-medium text-blue-foreground"
    >
      <UserRound aria-hidden className="size-3" />
      {t("explore.board.mine.yours")}
    </span>
  );
}

// Doodle has the thing: it can move it, never rewrite or delete it.
export function TakenIn() {
  const t = useTranslation().t;
  return (
    <span
      title={t("explore.board.mine.takenInHint")}
      className="inline-flex h-5 items-center gap-1 rounded-full bg-card px-1.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--line-soft)]"
    >
      <Check aria-hidden className="size-3" />
      {t("explore.board.mine.takenIn")}
    </span>
  );
}
