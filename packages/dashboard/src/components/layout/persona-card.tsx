// A persona Sprocket proposes, as its own card under the reply: a head that
// says what will happen, the persona exactly as the Personas page will show
// it (persona-tile.tsx), and a strip with the decision. While it waits, Add
// or Change something; afterwards, what became of it: added (and a way to
// its page) or not added.

import { Link } from "react-router";
import { Check, ChevronRight, PencilLine, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { faceFrom } from "@/api/client";
import { useRead } from "@/api/query";
import { personasSchema } from "@/api/schemas/personas";
import { CARD } from "@/components/page-bits";
import { PersonaTile } from "@/components/persona-tile";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/persona-proposal";
import { personaPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

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
  const added = useAdded(proposal.name);
  const waiting = onAdd !== undefined;
  return (
    <figure
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border-soft bg-background shadow-card transition-opacity motion-safe:animate-rise",
        !waiting && !added && "opacity-60",
      )}
    >
      <figcaption className="flex items-center gap-2 border-b border-border-soft px-3.5 py-2.5 text-[12.5px] font-medium">
        <span className="flex size-6 flex-none items-center justify-center rounded-lg bg-blue/10 text-blue [&_svg]:size-3.5">
          <UserPlus aria-hidden />
        </span>
        {t("support.persona.label")}
      </figcaption>
      <div className="p-3">
        <div className={cn(CARD, "flex flex-col gap-3 px-5 py-4")}>
          <PersonaTile
            face={faceFrom(proposal)}
            name={proposal.name}
            place={proposal.place}
            about={proposal.about}
          />
        </div>
      </div>
      <div className="flex min-h-11 items-center gap-1.5 border-t border-border-soft bg-surface/60 px-3.5 py-2 text-[12.5px]">
        <Decision
          name={proposal.name}
          added={added}
          onAdd={onAdd}
          onChange={onChange}
        />
      </div>
    </figure>
  );
}

// The strip at the bottom: Add or Change something while it waits, then
// whether it was added.
function Decision({
  name,
  added,
  onAdd,
  onChange,
}: Readonly<{
  name: string;
  added: string | null;
  onAdd: (() => void) | undefined;
  onChange: (() => void) | undefined;
}>) {
  const t = useTranslation().t;
  if (onAdd)
    return (
      <>
        <Button size="pill-sm" onClick={onAdd}>
          <Check aria-hidden />
          {t("support.persona.add", { name })}
        </Button>
        <Button size="pill-sm" variant="ghost" onClick={onChange}>
          <PencilLine aria-hidden />
          {t("support.persona.change")}
        </Button>
      </>
    );
  if (!added)
    return (
      <span className="text-muted-foreground">
        {t("support.persona.notAdded")}
      </span>
    );
  return (
    <>
      <span className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5">
        <Check aria-hidden className="text-blue" />
        {t("support.persona.added", { name })}
      </span>
      <Link
        to={personaPath(added)}
        className="ml-auto flex items-center gap-0.5 rounded-full px-2 py-0.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground [&_svg]:size-3.5"
      >
        {t("support.persona.open")}
        <ChevronRight aria-hidden />
      </Link>
    </>
  );
}

// The id of the persona with this name, once it is added.
function useAdded(name: string): string | null {
  const { data } = useRead("/api/kobble/personas", personasSchema);
  const wanted = name.trim().toLowerCase();
  return (
    data?.personas.find((one) => one.name.trim().toLowerCase() === wanted)
      ?.id ?? null
  );
}
