// A persona Sprocket proposes, as its card in the chat: the kobold it will
// have (the same face adding it gives it), its first name, where it is and
// who it is. While it is the last thing said, the person can add it with one
// click or say what to change.

import { Check, MapPin, PencilLine } from "lucide-react";
import { useTranslation } from "react-i18next";

import { faceFrom } from "@/api/client";
import { FACE_COLORS, PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/persona-proposal";

export function PersonaCard({
  proposal,
  onAdd,
  onChange,
}: Readonly<{
  proposal: Proposal;
  // Only while it waits for an answer.
  onAdd?: () => void;
  onChange?: () => void;
}>) {
  const t = useTranslation().t;
  const face = faceFrom(proposal);
  const tint = FACE_COLORS[face.color];
  return (
    <figure className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-card shadow-card motion-safe:animate-rise">
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{
          background: `linear-gradient(to bottom, ${tint.bg}, transparent)`,
        }}
      >
        <PersonaFace
          face={face}
          size={52}
          className="motion-safe:animate-pop"
        />
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[11px] font-medium" style={{ color: tint.fg }}>
            {t("support.persona.label")}
          </span>
          <b className="truncate text-[17px] leading-tight font-semibold">
            {proposal.name}
          </b>
          {proposal.place && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground [&_svg]:size-3 [&_svg]:flex-none">
              <MapPin aria-hidden />
              <span className="truncate">{proposal.place}</span>
            </span>
          )}
        </div>
      </div>
      {proposal.about && (
        <figcaption className="px-4 pb-3 text-[13px] leading-relaxed">
          {proposal.about}
        </figcaption>
      )}
      {onAdd && (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <Button size="pill-sm" onClick={onAdd}>
            <Check aria-hidden />
            {t("support.persona.add", { name: proposal.name })}
          </Button>
          <Button size="pill-sm" variant="ghost" onClick={onChange}>
            <PencilLine aria-hidden />
            {t("support.persona.change")}
          </Button>
        </div>
      )}
    </figure>
  );
}
