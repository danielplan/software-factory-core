// Explorations on the page: the list and one exploration (#explore,
// #explore/<id>, which fills the window), the count of explorations being
// explored in the sidebar, and its block on Home. The app mounts it only
// while Explorations is installed.

import { FlaskConical } from "lucide-react";

import { useExplorations } from "@/api/use-explorations";
import { PageCount } from "@/components/layout/page-count";
import type { PageModule, PageProps } from "@/lib/page-module";

import { ExplorationPage } from "./exploration-page";
import { ExplorationsPage } from "./explorations-page";
import { ExploringBlock } from "./home-block";

function Page({ open }: PageProps) {
  return open ? <ExplorationPage id={open} /> : <ExplorationsPage />;
}

function Count() {
  const { data } = useExplorations();
  return <PageCount n={data?.exploring.length ?? 0} />;
}

export const explorations: PageModule = {
  id: "explorations",
  pages: [
    {
      id: "explore",
      Page,
      sidebar: {
        group: "work",
        icon: <FlaskConical aria-hidden />,
        color: "var(--explore)",
        Count,
      },
      // An exploration fills the whole window: its canvas needs the room,
      // and its own bar leads back.
      fills: (open) => open !== null,
    },
  ],
  blocks: ({ state, input }) => ({
    exploring: <ExploringBlock input={input} addOns={state.addOns} />,
  }),
};
