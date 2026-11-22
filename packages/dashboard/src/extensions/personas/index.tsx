// Personas on the page: its page (#personas, #personas/<id> and a
// persona's tests), in the sidebar's Customers group. The app mounts it
// only while Personas is installed.

import { Users } from "lucide-react";

import type { PageModule, PageProps } from "@/lib/page-module";

import { PersonasPage } from "./personas-page";

function Page({ open }: PageProps) {
  return <PersonasPage open={open} />;
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
    },
  ],
};
