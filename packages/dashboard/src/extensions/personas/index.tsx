// Personas on the page: its page (#personas, #personas/<id> and a
// persona's tests), in the sidebar's Customers group. The app mounts it
// only while Personas is installed.

import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRead } from "@/api/query";
import { personasSchema } from "@/api/schemas/personas";
import { useReport } from "@/lib/meet";
import { testerNow } from "@/lib/meet-view";
import type { PageModule, PageProps } from "@/lib/page-module";

import { PersonasPage } from "./personas-page";

function Page({ open }: PageProps) {
  return <PersonasPage open={open} />;
}

// Mimic: at work while a persona is on a mission.
function Watch() {
  const t = useTranslation().t;
  const { data } = useRead("/api/kobble/personas", personasSchema);
  const on = (data?.personas ?? [])
    .filter((persona) => persona.onMission)
    .map((persona) => persona.name);
  const now = testerNow(on, t);
  useReport("tester", now ? { now, last: null } : null);
  return null;
}

export const personas: PageModule = {
  id: "personas",
  pages: [
    {
      id: "personas",
      Page,
      sidebar: {
        group: "customers",
        icon: <Users aria-hidden />,
        color: "var(--source-app)",
      },
      Watch,
    },
  ],
};
