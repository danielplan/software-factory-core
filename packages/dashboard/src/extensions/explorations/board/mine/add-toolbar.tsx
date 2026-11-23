// The toolbar for adding to the board: pen, note, picture, link. Variant A
// floats centred at the bottom (clear of the zoom buttons bottom-left),
// variant B sits in the top-left corner like a tool panel; chosen by the
// page address (variant.ts). Everything else is the same.

import { Panel } from "@xyflow/react";
import { Image, Link2, Pencil, StickyNote } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Tool } from "./mine-layer";
import { addressOf } from "./preview";
import { toolbarVariant } from "./variant";

export function AddToolbar({
  tool,
  onTool,
  onPicture,
  onLink,
}: Readonly<{
  tool: Tool;
  onTool: (tool: Tool) => void;
  onPicture: (file: File) => void;
  onLink: (address: string) => void;
}>) {
  const t = useTranslation().t;
  const below = toolbarVariant() === "B";
  const picker = useRef<HTMLInputElement>(null);
  const [linking, setLinking] = useState(false);
  const [bad, setBad] = useState(false);
  const toggle = (now: Exclude<Tool, null>) => {
    setLinking(false);
    onTool(tool === now ? null : now);
  };
  return (
    <Panel position={below ? "top-left" : "bottom-center"}>
      <div
        role="toolbar"
        aria-label={t("explore.board.mine.label")}
        className="relative flex items-center gap-1 rounded-xl bg-card p-1 shadow-[0_0_0_1px_var(--border),0_6px_20px_-8px_rgb(20_24_36/0.25)]"
      >
        <Button
          type="button"
          size="pill-sm"
          variant={tool === "pen" ? "blue" : "ghost"}
          aria-pressed={tool === "pen"}
          title={t("explore.board.mine.penHint")}
          onClick={() => {
            toggle("pen");
          }}
        >
          <Pencil aria-hidden />
          {t("explore.board.mine.pen")}
        </Button>
        <Button
          type="button"
          size="pill-sm"
          variant={tool === "note" ? "blue" : "ghost"}
          aria-pressed={tool === "note"}
          title={t("explore.board.mine.noteHint")}
          onClick={() => {
            toggle("note");
          }}
        >
          <StickyNote aria-hidden />
          {t("explore.board.mine.note")}
        </Button>
        <Button
          type="button"
          size="pill-sm"
          variant="ghost"
          title={t("explore.board.mine.pictureHint")}
          onClick={() => {
            setLinking(false);
            onTool(null);
            picker.current?.click();
          }}
        >
          <Image aria-hidden />
          {t("explore.board.mine.picture")}
        </Button>
        <input
          ref={picker}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-label={t("explore.board.mine.picture")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPicture(file);
          }}
        />
        <Button
          type="button"
          size="pill-sm"
          variant={linking ? "blue" : "ghost"}
          aria-pressed={linking}
          title={t("explore.board.mine.linkHint")}
          onClick={() => {
            onTool(null);
            setBad(false);
            setLinking((now) => !now);
          }}
        >
          <Link2 aria-hidden />
          {t("explore.board.mine.link")}
        </Button>
        {tool && (
          <span className="px-2 text-[11.5px] whitespace-nowrap text-muted-foreground">
            {tool === "pen"
              ? t("explore.board.mine.penOn")
              : t("explore.board.mine.noteHere")}
          </span>
        )}
        {linking && (
          <form
            className={cn(
              "absolute left-0 flex w-[320px] max-w-[80vw] flex-wrap items-center gap-1.5 rounded-xl bg-card p-1.5 shadow-[0_0_0_1px_var(--border),0_6px_20px_-8px_rgb(20_24_36/0.25)]",
              below ? "top-full mt-2" : "bottom-full mb-2",
            )}
            onSubmit={(event) => {
              event.preventDefault();
              const text = new FormData(event.currentTarget).get("address");
              const address = addressOf(typeof text === "string" ? text : "");
              if (!address) {
                setBad(true);
                return;
              }
              setLinking(false);
              onLink(address);
            }}
          >
            <input
              name="address"
              // The person opened it to type: the cursor goes in.
              ref={(box) => box?.focus()}
              aria-label={t("explore.board.mine.linkLabel")}
              placeholder={t("explore.board.mine.linkPlaceholder")}
              aria-invalid={bad}
              onChange={() => {
                setBad(false);
              }}
              className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-blue/25 aria-invalid:border-destructive"
            />
            <Button type="submit" size="pill-sm">
              <Link2 aria-hidden />
              {t("explore.board.mine.linkAdd")}
            </Button>
            {bad && (
              <p
                role="alert"
                className="basis-full px-1 text-[11.5px] text-destructive"
              >
                {t("explore.board.mine.linkBad")}
              </p>
            )}
          </form>
        )}
      </div>
    </Panel>
  );
}
