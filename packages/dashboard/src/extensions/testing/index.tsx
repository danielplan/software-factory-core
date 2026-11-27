// Testing on the page: its page (#testing, #testing/new, #testing/<test>),
// in the sidebar's Work group after the Factory. The app mounts it only
// while Testing is installed.

import { UserCheck } from "lucide-react";

import type { PageModule, PageProps } from "@/lib/page-module";

import { TestingPage } from "./testing-page";

function Page({ open }: PageProps) {
  return <TestingPage open={open} />;
}

export const testing: PageModule = {
  id: "testing",
  pages: [
    {
      id: "testing",
      Page,
      sidebar: {
        group: "work",
        icon: <UserCheck aria-hidden />,
        color: "var(--merged)",
      },
    },
  ],
};
