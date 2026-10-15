import { Check, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Text = { name: string; about: string };

// A card on the setup map: what the coach drafted, and, after the pencil,
// its name and sentence to change (or the card to take off the map).
export function DraftTile({
  text,
  placeholder,
  top,
  children,
  className,
  onSave,
  onRemove,
}: Readonly<{
  text: Text;
  placeholder: Text;
  top?: ReactNode;
  children?: ReactNode;
  className?: string;
  onSave: (text: Text) => void;
  onRemove?: () => void;
}>) {
  const [editing, setEditing] = useState<Text | null>(null);
  if (editing)
    return (
      <TileEditor
        text={editing}
        about={placeholder.about}
        className={className}
        onText={setEditing}
        onDone={() => {
          onSave(editing);
          setEditing(null);
        }}
        onRemove={onRemove}
      />
    );
  return (
    <div
      className={cn(
        "group relative grid animate-pop gap-1.5 rounded-2xl bg-card p-4 shadow-soft",
        className,
      )}
    >
      {top}
      <span
        className={cn(
          "pr-8 text-[15px] font-medium",
          !text.name && "text-muted-foreground",
        )}
      >
        {text.name || placeholder.name}
      </span>
      <span className="text-[13px] leading-snug text-muted-foreground">
        {text.about || placeholder.about}
      </span>
      {children}
      <button
        type="button"
        aria-label={`Change ${text.name || placeholder.name}`}
        onClick={() => {
          setEditing(text);
        }}
        className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-60 group-hover:opacity-100 hover:bg-surface-2 focus-visible:opacity-100 [&_svg]:size-3.5"
      >
        <Pencil aria-hidden />
      </button>
    </div>
  );
}

function TileEditor({
  text,
  about,
  className,
  onText,
  onDone,
  onRemove,
}: Readonly<{
  text: Text;
  about: string;
  className?: string;
  onText: (text: Text) => void;
  onDone: () => void;
  onRemove?: () => void;
}>) {
  return (
    <div className={cn("grid gap-2.5 rounded-2xl bg-card p-4", className)}>
      <Input
        aria-label="Name"
        value={text.name}
        autoFocus
        onChange={(event) => {
          onText({ ...text, name: event.target.value });
        }}
      />
      <Input
        aria-label="What it does"
        value={text.about}
        placeholder={about}
        onChange={(event) => {
          onText({ ...text, about: event.target.value });
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {onRemove ? (
          <Button
            variant="ghost"
            className="h-9 px-2.5 text-[13px] text-muted-foreground"
            onClick={onRemove}
          >
            <Trash2 aria-hidden /> Take off the map
          </Button>
        ) : (
          <span />
        )}
        <Button
          className="h-9 px-3.5 text-[13px]"
          disabled={!text.name.trim()}
          onClick={onDone}
        >
          <Check aria-hidden /> Save
        </Button>
      </div>
    </div>
  );
}
