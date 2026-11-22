// Home, the first page, built from blocks the extensions bring: how the
// product is doing in a line (System has the rest), what waits for the owner,
// the loop from what came in to what is done, and more the team adds. The
// team arranges it (Arrange Home); one Home for everybody.

import { Plus, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHead } from "@/components/layout/page-head";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/confirm";

import { offeredOf, START } from "@/lib/home-layout";
import { waitingOf } from "@/lib/home-view";
import type { HomeBlocks as ExtensionBlocks } from "@/lib/page-module";

import type { FactoryState } from "@/api/client";
import { ArrangeButton, HomeBlocks } from "./home-blocks";
import { TeamBlock } from "./team-block";
import { useHomeInput, useHomeLayout } from "./use-home-layout";

// The blocks the installed extensions bring (featureBlocks), each by its id,
// are drawn from what Home has read. The app hands them to Home
// (app/extensions.ts), so Home never imports an extension.
export function HomePage({
  state,
  featureBlocks,
}: Readonly<{ state: FactoryState; featureBlocks: ExtensionBlocks }>) {
  const t = useTranslation().t;
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
  const waiting = waitingOf(input, t);
  const { addOns } = state;
  const blocks: Record<string, ReactNode> = {
    ...featureBlocks({ state, input, waiting }),
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
        title={t("shell.pages.home")}
        about={t("home.about")}
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
          {t("home.arrange.notKept")}
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
  const t = useTranslation().t;
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
          {t("home.arrange.reset")}
        </Button>
      )}
      {arranging && (
        <Button variant="ring" size="pill" onClick={onAdd}>
          <Plus aria-hidden />
          {t("home.arrange.add")}
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
  const t = useTranslation().t;
  return (
    <Confirm
      question={
        open
          ? {
              title: t("home.arrange.resetTitle"),
              lines: [t("home.arrange.resetText")],
              yes: t("home.arrange.resetYes"),
              onYes: onReset,
            }
          : null
      }
      onClose={onClose}
    />
  );
}
