// Releases on the page: its page (#releases), what is coming and what went
// out. The app mounts it only while Releases is installed.

import { Tag } from "lucide-react";

import type { PageModule } from "@/lib/page-module";

import { ReleasesPage } from "./releases-page";

export const releases: PageModule = {
  id: "releases",
  pages: [
    {
      id: "releases",
      Page: ReleasesPage,
      sidebar: {
        group: "work",
        icon: <Tag aria-hidden />,
        color: "var(--build)",
      },
    },
  ],
};
