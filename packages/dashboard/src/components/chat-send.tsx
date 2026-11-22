// The button every chat with a kobold ends its box with: Send, also while
// the kobold answers (the words join that answer, steering it), and Stop in
// its place while it answers and nothing is typed.

import { ArrowUp, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function ChatSend({
  busy,
  typed,
  onStop,
  size,
  className,
  label,
}: Readonly<{
  // The kobold is answering.
  busy: boolean;
  // Something is typed to send.
  typed: boolean;
  onStop: () => void;
  size: "pill-sm" | "icon-sm";
  className?: string;
  // Its name, when the place has another Send (Sprocket's window).
  label?: string;
}>) {
  const t = useTranslation().t;
  if (busy && !typed)
    return (
      <Button
        type="button"
        size={size}
        variant="ring"
        aria-label={t("chat.stop")}
        title={t("chat.stop")}
        className={className}
        onClick={onStop}
      >
        <Square aria-hidden className="size-3 fill-current" />
      </Button>
    );
  return (
    <Button
      type="submit"
      size={size}
      aria-label={label ?? t("chat.send")}
      title={busy ? t("chat.steer") : (label ?? t("chat.send"))}
      className={className}
      disabled={!typed}
    >
      <ArrowUp aria-hidden className="size-4" />
    </Button>
  );
}
