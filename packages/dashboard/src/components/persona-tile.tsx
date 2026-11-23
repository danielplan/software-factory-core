// What a persona's card on the Personas page shows: their kobold, their
// name, who they are and where (the persona's place line, "Bakery owner ·
// back office"), and a few lines about them. The same on the page and where
// Sprocket proposes one, so the team sees the card it will get.

import { useTranslation } from "react-i18next";

import type { Face } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

export function PersonaTile({
  face,
  name,
  place,
  about,
  nameClass,
}: Readonly<{
  face: Face;
  name: string;
  place: string;
  about: string;
  nameClass?: string;
}>) {
  const t = useTranslation().t;
  return (
    <>
      <span className="flex items-center gap-3">
        <PersonaFace face={face} size={44} />
        <span className="grid min-w-0 gap-0.5">
          <span className={cn("truncate font-semibold", nameClass)}>
            {name}
          </span>
          {place && (
            <span className="truncate text-[12.5px] text-muted-foreground">
              {place}
            </span>
          )}
        </span>
      </span>
      <span className="line-clamp-3 text-[14px] leading-normal text-foreground-2">
        {about ? (
          <Markdown text={about} inline />
        ) : (
          <span className="text-muted-foreground">
            {t("personas.noDescription")}
          </span>
        )}
      </span>
    </>
  );
}
