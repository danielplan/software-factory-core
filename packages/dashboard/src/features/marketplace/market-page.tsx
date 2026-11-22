// The Marketplace: what the factory can do and the services it works with,
// in three tabs: Extensions, Connections and Product kits. A card opens its
// details. Installing one that needs others asks first and installs them
// together; removing asks first, and one that others need is refused;
// switching the board work is tracked on asks first, then goes to where it
// is connected.

import { Package, Plug, Puzzle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import type { AddOnView, FactoryState } from "@/api/client";
import { PageHead } from "@/components/layout/page-head";
import { ProblemBox } from "@/components/layout/problem-box";
import { useT } from "@/i18n/use-t";
import { boardAction, thingOf } from "@/lib/market-view";
import { useFlip } from "@/hooks/use-flip";
import { cn } from "@/lib/utils";

import { Confirm } from "@/components/confirm";
import { BoardButton, ConnectionsTab } from "./connections-tab";
import { DetailsDialog } from "./details-dialog";
import { ExtensionsTab, InstallButton } from "./extensions-tab";
import { KitsTab } from "./kits-tab";
import { useMarket } from "./use-market";

const TABS = [
  { id: "extensions", icon: <Puzzle aria-hidden /> },
  { id: "connections", icon: <Plug aria-hidden /> },
  { id: "kits", icon: <Package aria-hidden /> },
] as const;
type TabId = (typeof TABS)[number]["id"];

// The tab the address opens (#extensions/connections), or the first.
const tabOf = (open: string | null): TabId =>
  TABS.find((one) => one.id === open)?.id ?? "extensions";

const hashOf = (tab: TabId) =>
  tab === "extensions" ? "#extensions" : `#extensions/${tab}`;

export function MarketPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const t = useT();
  const tab = tabOf(open);
  const { addOns, products, kits } = state;
  const boards = addOns.filter((addOn) => addOn.tracker);
  const tracker = state.company.tracker;
  const codeBy = state.slots.find((one) => one.slot === "code")?.inUse;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const market = useMarket(addOns);
  const page = useRef<HTMLDivElement>(null);
  useFlip(page);
  const opened = thingOf(
    t.market,
    t.shell,
    { addOns, kits, products, tracker, ...(codeBy ? { codeBy } : {}) },
    openKey,
  );
  const openedAddOn =
    addOns.find((one) => opened?.key === `extension:${one.id}`) ?? null;
  const closeDetails = () => {
    setOpenKey(null);
  };
  const switchBoard = (from: AddOnView, to: AddOnView) => {
    closeDetails();
    market.switchBoard(from, to);
  };
  return (
    <div ref={page} className="grid gap-5">
      <PageHead title={t.shell.pages.extensions} about={t.market.about} />
      <Tabs tab={tab} />
      {market.problem && (
        <ProblemBox title={t.connect.didNotWork} text={market.problem} />
      )}
      <Panel
        tab={tab}
        state={state}
        fresh={market.fresh}
        leaving={market.leaving}
        onOpen={setOpenKey}
        onInstall={market.install}
        onSwitch={switchBoard}
      />
      <DetailsDialog
        thing={opened}
        addOn={openedAddOn}
        addOns={addOns}
        state={state}
        action={
          <MainAction
            key={openKey}
            addOn={openedAddOn}
            board={boards.find((one) => `tasks:${one.id}` === openKey)}
            boards={boards}
            tracker={tracker}
            onInstall={(addOn) => {
              closeDetails();
              market.install(addOn);
            }}
            onSwitch={switchBoard}
          />
        }
        onClose={closeDetails}
        onOpen={(to) => {
          if (to === "connections") {
            closeDetails();
            window.location.hash = hashOf("connections");
          } else setOpenKey(to);
        }}
        onRemove={(addOn) => {
          closeDetails();
          market.remove(addOn);
        }}
      />
      <Confirm question={market.question} onClose={market.closeQuestion} />
    </div>
  );
}

// The main action in the details: Install for an extension that is not
// installed, Connect or Switch for a board that is not in use.
function MainAction({
  addOn,
  board,
  boards,
  tracker,
  onInstall,
  onSwitch,
}: Readonly<{
  addOn: AddOnView | null;
  board: AddOnView | undefined;
  boards: AddOnView[];
  tracker: string;
  onInstall: (addOn: AddOnView) => void;
  onSwitch: (from: AddOnView, to: AddOnView) => void;
}>) {
  if (addOn && !addOn.on)
    return (
      <InstallButton
        onInstall={() => {
          onInstall(addOn);
        }}
      />
    );
  if (!board) return null;
  return (
    <BoardButton
      action={boardAction(boards, board, tracker)}
      board={board}
      onSwitch={onSwitch}
    />
  );
}

// The three tabs in the design system's tab track, a marker sliding
// between them (not when the person prefers reduced motion).
function Tabs({ tab }: Readonly<{ tab: TabId }>) {
  const t = useT().market;
  const links = useRef<Partial<Record<TabId, HTMLAnchorElement | null>>>({});
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const at = links.current[tab];
    if (at && marker.current) {
      marker.current.style.left = `${String(at.offsetLeft)}px`;
      marker.current.style.width = `${String(at.offsetWidth)}px`;
      marker.current.style.display = "block";
    }
  }, [tab]);
  return (
    <div
      role="tablist"
      aria-label={t.tabsLabel}
      className="relative inline-flex w-fit gap-1 rounded-xl bg-surface-2 p-1"
    >
      <span
        ref={marker}
        aria-hidden
        className="absolute top-1 bottom-1 hidden rounded-lg bg-card shadow-current transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
      />
      {TABS.map(({ id, icon }) => (
        <a
          key={id}
          ref={(el) => {
            links.current[id] = el;
          }}
          role="tab"
          href={hashOf(id)}
          aria-selected={tab === id}
          className={cn(
            "relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200 [&_svg]:size-3.5",
            tab === id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {icon}
          {t.tabs[id]}
        </a>
      ))}
    </div>
  );
}

// The tab that is open.
function Panel({
  tab,
  state,
  fresh,
  leaving,
  onOpen,
  onInstall,
  onSwitch,
}: Readonly<{
  tab: TabId;
  state: FactoryState;
  fresh: string[];
  leaving: string | null;
  onOpen: (key: string) => void;
  onInstall: (addOn: AddOnView) => void;
  onSwitch: (from: AddOnView, to: AddOnView) => void;
}>) {
  const { addOns, products, kits } = state;
  if (tab === "connections")
    return (
      <ConnectionsTab
        addOns={addOns}
        boards={addOns.filter((addOn) => addOn.tracker)}
        tracker={state.company.tracker}
        codeBy={state.slots.find((one) => one.slot === "code")?.inUse}
        onOpen={onOpen}
        onSwitch={onSwitch}
      />
    );
  if (tab === "kits")
    return <KitsTab kits={kits} products={products} onOpen={onOpen} />;
  return (
    <ExtensionsTab
      addOns={addOns}
      fresh={fresh}
      leaving={leaving}
      onOpen={onOpen}
      onInstall={onInstall}
    />
  );
}
