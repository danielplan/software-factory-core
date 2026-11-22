// Above the personas: Send everyone sends each persona not on a mission
// on the mission the kobold suggests for them.

import { Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  get,
  messageOf,
  type MissionIdea,
  type PersonaRow,
} from "@/api/client";
import { Button } from "@/components/ui/button";

import { ideaPath, send } from "./missions";

export function SendEveryone({
  personas,
}: Readonly<{ personas: PersonaRow[] }>) {
  const t = useTranslation().t;
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const waiting = personas.filter((persona) => !persona.onMission);
  const go = () => {
    setSending(true);
    setFailed(null);
    Promise.all(
      waiting.map(async (persona) => {
        const { mission } = await get<{ mission: MissionIdea }>(
          ideaPath(persona.id),
        );
        await send(persona.id, mission);
      }),
    ).then(
      () => {
        setSending(false);
      },
      (error: unknown) => {
        setSending(false);
        setFailed(messageOf(error));
      },
    );
  };
  return (
    <>
      {failed && (
        <span role="alert" className="text-[12.5px] text-destructive">
          {failed}
        </span>
      )}
      <Button
        size="pill"
        busy={sending}
        disabled={sending || waiting.length === 0}
        onClick={go}
      >
        <Send aria-hidden strokeWidth={2} className="size-[15px]" />
        {waiting.length === 0
          ? t("personas.missions.everyone")
          : t("personas.missions.sendEveryone")}
      </Button>
    </>
  );
}
