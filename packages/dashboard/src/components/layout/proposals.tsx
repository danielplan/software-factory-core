// What Sprocket proposes, each as a proposal card (proposal-card.tsx): a
// persona to add, shown as the Personas page will show it, and a mission
// to send a persona on. Each knows what became of it: a persona is added
// once the Personas page has it; a mission is sent once the person said
// yes to it.

import type { TFunction } from "i18next";
import { Send, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { faceFrom } from "@/api/client";
import { useRead } from "@/api/query";
import { personasSchema } from "@/api/schemas/personas";
import { CARD } from "@/components/page-bits";
import { PersonaTile } from "@/components/persona-tile";
import { type Decision, ProposalCard } from "@/components/proposal-card";
import type { Block } from "@/lib/proposal-blocks";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

// Where the person is with a proposal: it waits (and how they answer), it
// is being written, or they answered (yes, or something else).
export type Answer =
  | { state: "waiting"; onSay: (text: string) => void; onChange: () => void }
  | { state: "shown" }
  | { state: "answered"; yes: boolean };

export function Proposal({
  block,
  answer,
}: Readonly<{ block: Block; answer: Answer }>) {
  return block.kind === "persona" ? (
    <PersonaProposal block={block} answer={answer} />
  ) : (
    <MissionProposal block={block} answer={answer} />
  );
}

// What the person says when they press the card's action.
export function yesTo(block: Block, t: TFunction) {
  return block.kind === "persona"
    ? t("support.persona.yes", { name: block.name })
    : t("support.mission.yes");
}

function usePersonas() {
  return useRead("/api/kobble/personas", personasSchema).data?.personas ?? [];
}

function PersonaProposal({
  block,
  answer,
}: Readonly<{
  block: Extract<Block, { kind: "persona" }>;
  answer: Answer;
}>) {
  const t = useTranslation().t;
  const wanted = block.name.trim().toLowerCase();
  const added = usePersonas().find(
    (one) => one.name.trim().toLowerCase() === wanted,
  );
  const decision = ((): Decision => {
    if (answer.state === "waiting")
      return {
        state: "waiting",
        action: t("support.persona.add", { name: block.name }),
        onAct: () => {
          answer.onSay(t("support.persona.yes", { name: block.name }));
        },
        onChange: answer.onChange,
      };
    if (answer.state === "shown") return { state: "shown" };
    if (added)
      return {
        state: "done",
        said: t("support.persona.added", { name: block.name }),
        to: { href: personaHash(added.id), label: t("support.proposal.open") },
      };
    return { state: "dropped", said: t("support.persona.notAdded") };
  })();
  return (
    <ProposalCard
      icon={<UserPlus aria-hidden />}
      title={t("support.persona.label")}
      decision={decision}
    >
      <div className={cn(CARD, "flex flex-col gap-3 px-5 py-4")}>
        <PersonaTile
          face={faceFrom(block)}
          name={block.name}
          place={block.place}
          about={block.about}
        />
      </div>
    </ProposalCard>
  );
}

function MissionProposal({
  block,
  answer,
}: Readonly<{
  block: Extract<Block, { kind: "mission" }>;
  answer: Answer;
}>) {
  const t = useTranslation().t;
  const persona = usePersonas().find((one) => one.id === block.persona);
  const name = persona?.name ?? block.persona;
  const decision = ((): Decision => {
    if (answer.state === "waiting")
      return {
        state: "waiting",
        action: t("support.mission.send", { name }),
        icon: <Send aria-hidden />,
        onAct: () => {
          answer.onSay(t("support.mission.yes"));
        },
        onChange: answer.onChange,
      };
    if (answer.state === "shown") return { state: "shown" };
    if (answer.yes)
      return {
        state: "done",
        said: t("support.mission.sent", { name }),
        to: {
          href: personaHash(block.persona),
          label: t("support.mission.watch"),
        },
      };
    return { state: "dropped", said: t("support.mission.notSent") };
  })();
  return (
    <ProposalCard
      icon={<Send aria-hidden />}
      title={t("support.mission.label")}
      decision={decision}
    >
      <div className={cn(CARD, "grid gap-3 px-5 py-4")}>
        {persona && (
          <PersonaTile
            face={persona.face}
            name={persona.name}
            place={persona.place}
            about=""
            compact
          />
        )}
        <p className="border-l-2 border-blue/40 pl-3 text-[14px] leading-normal">
          {block.task}
        </p>
      </div>
    </ProposalCard>
  );
}
