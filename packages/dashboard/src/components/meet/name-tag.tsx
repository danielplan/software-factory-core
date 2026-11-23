// A name tag where a kobold works: on a prototype card, a Factory card, a
// persona test, signals being sorted. Two lines and the face: "Name · role"
// in the normal text, and in the secondary grey what it does and what it
// means for you. A click opens the "Your kobolds" panel with it lit.

import { useTranslation } from "react-i18next";

import { KoboldHead } from "@/components/kobold-face";
import { memberOf, type TeamId } from "@/lib/kobolds";
import { openTeam } from "@/lib/meet";
import { cn } from "@/lib/utils";

export function NameTag({
  id,
  line,
  className,
}: Readonly<{
  id: TeamId;
  // The one grey line under the name: what it does and what it means for you.
  line: string;
  className?: string;
}>) {
  const t = useTranslation().t;
  const member = memberOf(id);
  return (
    <button
      type="button"
      title={t("meet.meet")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTeam(id);
      }}
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-shadow hover:shadow-card",
        className,
      )}
      style={{
        borderColor: `${member.color}40`,
        background: `${member.color}10`,
      }}
    >
      <KoboldHead
        size={34}
        hat={member.hat}
        color={member.color}
        className="mt-0.5 motion-safe:animate-bob"
      />
      <span className="grid min-w-0 flex-1 gap-0.5 text-xs leading-snug">
        <span className="font-semibold break-words text-foreground">
          {member.name} · {t(`meet.roles.${id}`)}
        </span>
        <span className="break-words text-muted-foreground">{line}</span>
      </span>
    </button>
  );
}
