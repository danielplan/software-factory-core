// The factory on the owner's iPad or phone: a row at the bottom of the
// sidebar that shows, as a QR code and as a link, the address another device
// on this network opens once (with its key; server/src/app/reach.ts). Only
// on this computer, and only when the factory lets other devices in.

import { Check, Copy, Tablet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useRead } from "@/api/query";
import { Tile } from "@/components/layout/sidebar-links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const lanSchema = z.object({
  address: z.string().nullable(),
  // The address as a QR code: its side, in squares, and the dark ones.
  qr: z.object({ size: z.number(), path: z.string() }).nullable(),
});
type Qr = NonNullable<z.infer<typeof lanSchema>["qr"]>;
const HERE = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function DeviceRow() {
  const t = useTranslation().t;
  const here = HERE.has(globalThis.location.hostname);
  const lan = useRead(here ? "/api/lan" : null, lanSchema).data;
  if (!lan?.address || !lan.qr) return null;
  const { address, qr } = lan;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]"
        >
          <Tile color="#667085">
            <Tablet aria-hidden />
          </Tile>
          {t("shell.devices.row")}
        </button>
      </DialogTrigger>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-[400px]">
        <DialogTitle>{t("shell.devices.title")}</DialogTitle>
        <DialogDescription>{t("shell.devices.intro")}</DialogDescription>
        <QrCode qr={qr} label={address} />
        <CopyLink address={address} />
      </DialogContent>
    </Dialog>
  );
}

function QrCode({ qr, label }: Readonly<{ qr: Qr; label: string }>) {
  const { size, path } = qr;
  return (
    <svg
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      role="img"
      aria-label={label}
      className="mx-auto size-56 rounded-lg bg-white"
      shapeRendering="crispEdges"
    >
      <path d={path} fill="#101828" />
    </svg>
  );
}

function CopyLink({ address }: Readonly<{ address: string }>) {
  const t = useTranslation().t;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
        {address}
      </code>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
          });
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {t(copied ? "shell.devices.copied" : "shell.devices.copy")}
      </Button>
    </div>
  );
}
