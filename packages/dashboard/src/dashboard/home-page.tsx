// Home, the first page, built from blocks the extensions bring: how the
// product is doing in a line (System has the rest), what waits for the owner,
// the loop from what came in to what is done, and more the team adds. The
// team arranges it (Arrange Home); one Home for everybody.

import { Plus, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";

import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/extensions/confirm";
import { useT } from "@/i18n/use-t";
import { offeredOf, START } from "@/lib/home-layout";
import { waitingOf } from "@/lib/home-view";

import type { FactoryState } from "./dashboard";
import {
  ExploringBlock,
  LoopBlock,
  ReviewsBlock,
  SignalsBlock,
  StatusBlock,
  TeamBlock,
  WaitingBlock,
} from "./home-cards";
import { ArrangeButton, HomeBlocks } from "./home-blocks";
import { useHomeInput, useHomeLayout } from "./use-home-layout";

export function HomePage({ state }: Readonly<{ state: FactoryState }>) {
  const t = useT();
  const { layout, change, loaded, problemKeeping } = useHomeLayout(
    state.addOns,
  );
  const { input, read } = useHomeInput(state);
  const [arranging, setArranging] = useState(false);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Blocks are shown once what they show is read, so none of them grows or
  // moves after it appears.
  const ready = loaded && read;
  const waiting = waitingOf(input, t.home);
  const { addOns } = state;
  const blocks: Record<string, ReactNode> = {
    status: <StatusBlock state={state} />,
    waiting: <WaitingBlock waiting={waiting} />,
    loop: <LoopBlock input={input} state={state} />,
    exploring: <ExploringBlock input={input} addOns={addOns} />,
    signals: <SignalsBlock input={input} addOns={addOns} />,
    reviews: <ReviewsBlock waiting={waiting} addOns={addOns} />,
    // The blocks the team's own extensions describe.
    ...Object.fromEntries(
      addOns
        .flatMap((addOn) => addOn.screens.blocks)
        .map((view) => [
          view.id,
          <TeamBlock key={view.id} view={view} addOns={addOns} />,
        ]),
    ),
  };
  // The blocks of installed extensions that this page can draw.
  const offered = new Set([...offeredOf(addOns)].filter((id) => id in blocks));
  return (
    <>
      <PageHead
        title={t.shell.pages.home}
        about={t.home.about}
        actions={
          <ArrangeActions
            arranging={arranging}
            onReset={() => {
              setResetting(true);
            }}
            onAdd={() => {
              setAdding(true);
            }}
            onToggle={() => {
              setArranging(!arranging);
              setAdding(false);
              setResetting(false);
            }}
          />
        }
      />
      {problemKeeping && (
        <p role="alert" className="text-[13px] text-destructive">
          {t.home.arrange.notKept}
        </p>
      )}
      {ready && (
        <HomeBlocks
          blocks={blocks}
          layout={layout}
          onChange={change}
          addOns={addOns}
          offered={offered}
          editing={arranging}
          adding={adding}
          onAdding={setAdding}
        />
      )}
      <ResetHome
        open={resetting && arranging}
        onReset={() => {
          change(START);
        }}
        onClose={() => {
          setResetting(false);
        }}
      />
    </>
  );
}

// On the title line: Arrange Home; while arranging, Reset layout and Add a
// block come before Done.
function ArrangeActions({
  arranging,
  onReset,
  onAdd,
  onToggle,
}: Readonly<{
  arranging: boolean;
  onReset: () => void;
  onAdd: () => void;
  onToggle: () => void;
}>) {
  const t = useT().home.arrange;
  return (
    <>
      {arranging && (
        <Button
          variant="ghost"
          size="pill"
          className="text-muted-foreground"
          onClick={onReset}
        >
          <RotateCcw aria-hidden />
          {t.reset}
        </Button>
      )}
      {arranging && (
        <Button variant="ring" size="pill" onClick={onAdd}>
          <Plus aria-hidden />
          {t.add}
        </Button>
      )}
      <ArrangeButton editing={arranging} onClick={onToggle} />
    </>
  );
}

// Reset layout asks first: the arrangement is lost for the whole team.
function ResetHome({
  open,
  onReset,
  onClose,
}: Readonly<{ open: boolean; onReset: () => void; onClose: () => void }>) {
  const t = useT().home.arrange;
  return (
    <Confirm
      question={
        open
          ? {
              title: t.resetTitle,
              lines: [t.resetText],
              yes: t.resetYes,
              onYes: onReset,
            }
          : null
      }
      onClose={onClose}
    />
  );
}
