// A card's type, as a chip on the board and as a choice in its panel: what
// kind of work it is, each with its colour and icon.

import { Bug, Sparkles, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export type CardType = "bug" | "feature" | "improvement";

export const TYPES: {
  id: CardType;
  Icon: typeof Bug;
  tint: string;
}[] = [
  { id: "bug", Icon: Bug, tint: "bg-[#fdecec] text-[#b42318]" },
  {
    id: "feature",
    Icon: Sparkles,
    tint: "bg-wash text-wash-foreground",
  },
  {
    id: "improvement",
    Icon: TrendingUp,
    tint: "bg-[#e6f6f3] text-[#0d7a6d]",
  },
];

export function TypeChip({ type }: Readonly<{ type: CardType | null }>) {
  const t = useTranslation().t;
  const shown = TYPES.find((one) => one.id === type);
  if (!shown) return null;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        shown.tint,
      )}
    >
      <shown.Icon className="size-3" aria-hidden />
      {t(`factory.types.${shown.id}`)}
    </span>
  );
}

export function TypePicker({
  type,
  onPick,
}: Readonly<{
  type: CardType | null;
  onPick: (type: CardType | null) => void;
}>) {
  const t = useTranslation().t;
  return (
    <div
      role="radiogroup"
      aria-label={t("factory.types.label")}
      className="flex flex-wrap gap-2"
    >
      {TYPES.map(({ id, Icon, tint }) => {
        const on = type === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-all duration-150 hover:-translate-y-px",
              on
                ? cn(tint, "shadow-none ring-2 ring-current/30")
                : "bg-card text-foreground-2",
            )}
            onClick={() => {
              onPick(on ? null : id);
            }}
          >
            <Icon className="size-4" aria-hidden />
            {t(`factory.types.${id}`)}
          </button>
        );
      })}
    </div>
  );
}
