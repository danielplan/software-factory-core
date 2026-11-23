// The toolbar for adding to the board: pen, note, picture, link, floating
// centred at the bottom (clear of the zoom buttons bottom-left). The picture
// tool opens a picker; the link tool asks for the address.

import { Panel } from "@xyflow/react";
import { Image, Link2, Pencil, StickyNote } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { typedAddress } from "./address";
import type { Tool } from "./tool-layer";

const FLOATING =
  "shadow-[0_0_0_1px_var(--border),0_6px_20px_-8px_rgb(20_24_36/0.25)]";

function LinkForm({ onLink }: Readonly<{ onLink: (address: string) => void }>) {
  const t = useTranslation().t;
  const [bad, setBad] = useState(false);
  return (
    <form
      className={`absolute bottom-full left-0 mb-2 flex w-[320px] max-w-[80vw] flex-wrap items-center gap-1.5 rounded-xl bg-card p-1.5 ${FLOATING}`}
      onSubmit={(event) => {
        event.preventDefault();
        const text = new FormData(event.currentTarget).get("address");
        const address = typedAddress(typeof text === "string" ? text : "");
        if (address) onLink(address);
        else setBad(true);
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
  );
}

// The picture tool opens the computer's picker; the chosen picture goes in
// the middle of the view.
function PictureTool({
  onPicture,
  onBefore,
}: Readonly<{ onPicture: (file: File) => void; onBefore: () => void }>) {
  const t = useTranslation().t;
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <ToolButton
        title={t("explore.board.mine.pictureHint")}
        icon={<Image aria-hidden />}
        label={t("explore.board.mine.picture")}
        onClick={() => {
          onBefore();
          picker.current?.click();
        }}
      />
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
    </>
  );
}

// One tool's button: pressed while its tool is on.
function ToolButton({
  on,
  title,
  icon,
  label,
  onClick,
}: Readonly<{
  on?: boolean;
  title: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Button
      type="button"
      size="pill-sm"
      variant={on ? "blue" : "ghost"}
      aria-pressed={on ?? false}
      title={title}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

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
  const [linking, setLinking] = useState(false);
  const toggle = (now: Exclude<Tool, null>) => {
    setLinking(false);
    onTool(tool === now ? null : now);
  };
  return (
    <Panel position="bottom-center">
      <div
        role="toolbar"
        aria-label={t("explore.board.mine.label")}
        className={`relative flex items-center gap-1 rounded-xl bg-card p-1 ${FLOATING}`}
      >
        <ToolButton
          on={tool === "pen"}
          title={t("explore.board.mine.penHint")}
          icon={<Pencil aria-hidden />}
          label={t("explore.board.mine.pen")}
          onClick={() => {
            toggle("pen");
          }}
        />
        <ToolButton
          on={tool === "note"}
          title={t("explore.board.mine.noteHint")}
          icon={<StickyNote aria-hidden />}
          label={t("explore.board.mine.note")}
          onClick={() => {
            toggle("note");
          }}
        />
        <PictureTool
          onPicture={onPicture}
          onBefore={() => {
            setLinking(false);
            onTool(null);
          }}
        />
        <ToolButton
          on={linking}
          title={t("explore.board.mine.linkHint")}
          icon={<Link2 aria-hidden />}
          label={t("explore.board.mine.link")}
          onClick={() => {
            onTool(null);
            setLinking((now) => !now);
          }}
        />
        {tool && (
          <span className="px-2 text-[11.5px] whitespace-nowrap text-muted-foreground">
            {t(
              tool === "pen"
                ? "explore.board.mine.penOn"
                : "explore.board.mine.noteHere",
            )}
          </span>
        )}
        {linking && (
          <LinkForm
            onLink={(address) => {
              setLinking(false);
              onLink(address);
            }}
          />
        )}
      </div>
    </Panel>
  );
}
