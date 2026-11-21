// Removing a row from Explorations › Waiting: a bin, then "Delete?" with
// Cancel, so nothing goes on one click. The row leaves at once; when the
// factory refuses, it stays and says why.

import { Trash2, X } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";

export function RemoveRow({
  path,
  body,
  what,
  onGone,
  onProblem,
}: Readonly<{
  path: string;
  body: object;
  // What happens to it, said in the question.
  what: string;
  onGone: (gone: boolean) => void;
  onProblem: (problem: string) => void;
}>) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.explore.delete}
        title={t.explore.delete}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => {
          setAsking(true);
        }}
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    );
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[12.5px] text-foreground-2">{what}</span>
      <Button
        variant="ghost"
        size="pill-sm"
        onClick={() => {
          setAsking(false);
        }}
      >
        <X aria-hidden />
        {t.explore.cancel}
      </Button>
      <Button
        variant="destructive"
        size="pill-sm"
        onClick={() => {
          setAsking(false);
          onGone(true);
          post(path, body).catch((error: unknown) => {
            onGone(false);
            onProblem(messageOf(error));
          });
        }}
      >
        <Trash2 aria-hidden />
        {t.explore.delete}
      </Button>
    </span>
  );
}
