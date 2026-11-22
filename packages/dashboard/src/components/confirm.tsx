// A question before something that changes the factory: a title, a few
// lines, and what to press instead of cancelling.

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type Question = {
  title: string;
  lines: string[];
  yes: string;
  onYes: () => void;
};

export function Confirm({
  question,
  onClose,
}: Readonly<{ question: Question | null; onClose: () => void }>) {
  const t = useTranslation().t;
  return (
    <Dialog
      open={question !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogTitle>{question?.title}</DialogTitle>
        <DialogDescription className="grid gap-1">
          {question?.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <Button variant="ring" size="pill" onClick={onClose}>
            {t("market.cancel")}
          </Button>
          <Button
            size="pill"
            onClick={() => {
              question?.onYes();
              onClose();
            }}
          >
            {question?.yes}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
