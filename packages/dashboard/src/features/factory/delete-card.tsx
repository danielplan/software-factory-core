// The foot of an opened card: Delete, then "Delete #n?" with Cancel, so
// nothing goes on one click. A deleted card is closed as not planned on
// GitHub and taken off the board; not while the builder is on it. The
// board deletes it (and leaves it at once).

import { Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";

export function DeleteCard({
  number,
  building,
  onDelete,
}: Readonly<{
  number: number;
  building: boolean;
  onDelete: () => void;
}>) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  return (
    <footer className="mt-auto flex items-center gap-2 border-t border-border-soft px-5 py-3.5">
      {asking ? (
        <>
          <span className="flex-1 text-[13px] text-foreground-2">
            {t.factory.remove.ask(number)}
          </span>
          <Button
            variant="ghost"
            size="pill"
            onClick={() => {
              setAsking(false);
            }}
          >
            <X aria-hidden />
            {t.factory.remove.cancel}
          </Button>
          <Button
            variant="destructive"
            size="pill"

            onClick={onDelete}
          >
            <Trash2 aria-hidden />
            {t.factory.remove.delete}
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="pill"
          className="text-muted-foreground hover:text-destructive"
          disabled={building}
          title={building ? t.factory.remove.builderOnIt : undefined}
          onClick={() => {
            setAsking(true);
          }}
        >
          <Trash2 aria-hidden className="size-4" />{" "}
          {t.factory.remove.deleteCard}
        </Button>
      )}
    </footer>
  );
}
