// The "Your kobolds" panel, with all of them, Tinker too. A kobold's face
// (face.tsx), a name tag or a row of the sidebar's group opens it; the one
// clicked is lit.

import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeTeam, usePanel, usePanelReady } from "@/lib/meet";
import type { Now } from "@/lib/meet-view";

import { Workshop } from "./workshop";

export function TeamPanel({ now, last }: Readonly<{ now: Now; last: Now }>) {
  const t = useTranslation().t;
  const { open, focus } = usePanel();
  usePanelReady();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeTeam();
      }}
    >
      <DialogContent className="flex max-h-[92dvh] w-[1080px] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-[14px] bg-card p-0 sm:max-w-[1080px]">
        <div className="grid gap-1 px-6 pt-6 pr-12 pb-4">
          <DialogTitle className="text-[17px] tracking-[-0.01em]">
            {t("meet.title")}
          </DialogTitle>
          <DialogDescription>{t("meet.intro")}</DialogDescription>
        </div>
        <Workshop now={now} last={last} focus={focus} />
      </DialogContent>
    </Dialog>
  );
}
