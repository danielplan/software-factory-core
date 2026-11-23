import { Menu } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { KoboldHead } from "@/components/kobold-face";
import { Face } from "@/components/meet/face";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFactoryName, useLogo } from "@/lib/brand";
import { cn } from "@/lib/utils";

type SidebarProps = Readonly<{
  // The project's name (factory.json), in its wordmark font when its theme
  // gives one; Kobble's own name without one.
  name: string | null;
  // At the right of the phone's bar, such as the factory's light.
  status?: ReactNode;
  // The rows under the name: the factory's pages (factory-nav.tsx), or the
  // steps of setting up. onGo closes the phone's menu once a row is picked.
  children: (onGo?: () => void) => ReactNode;
}>;

// The way around Kobble, the same while it is set up and after: the
// project's name at the top and the rows under it. White, at the left of a
// wide screen; on a phone, a bar along the top whose menu opens the same
// list from the side.
export function Sidebar({ name, status, children }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslation().t;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-0.5 overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-strong px-3 pt-4 pb-3 md:flex">
        <span className="px-2 pb-4">
          <Wordmark name={name} size="big" />
        </span>
        {children()}
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-strong px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("shell.openMenu")}
            >
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[264px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-sidebar text-sidebar-strong px-4 pt-[22px] pb-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">{t("shell.menu")}</DialogTitle>
            <span className="px-2 pb-4">
              <Wordmark name={name} size="big" />
            </span>
            {children(() => {
              setOpen(false);
            })}
          </DialogContent>
        </Dialog>
        <Wordmark name={name} size="small" />
        {status}
      </header>
    </>
  );
}

// "Acme Factory": the company's name in its wordmark, the rest plainly;
// the factory's own name whole when it does not start with the company's.
function splitName(
  name: string | null,
  own: string | null,
): { mark: string; rest: string | null } {
  if (!own) return { mark: name ?? "kobble", rest: null };
  if (!name || !own.toLowerCase().startsWith(name.toLowerCase()))
    return { mark: own, rest: null };
  return { mark: name, rest: own.slice(name.length).trim() || null };
}

// The mark beside the name: the company's logo, the kobold for Kobble's own
// look, nothing when the theme leaves it out.
function Mark({ big }: Readonly<{ big: boolean }>) {
  const logo = useLogo();
  if (logo === "none") return null;
  if (!logo)
    return (
      <Face id="support">
        <KoboldHead size={big ? 32 : 26} />
      </Face>
    );
  return (
    <img
      src={logo}
      alt=""
      className={cn("flex-none rounded-lg", big ? "size-8" : "size-[26px]")}
    />
  );
}

// The project's name in its wordmark font (or the factory's own name, the
// company's part in the wordmark), with its mark; "kobble" without a name.
function Wordmark({
  name,
  size,
}: Readonly<{ name: string | null; size: "big" | "small" }>) {
  const big = size === "big";
  const { mark, rest } = splitName(name, useFactoryName());
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2.5 font-wordmark text-[21px] leading-none tracking-[-0.02em] [font-weight:var(--wordmark-weight,700)] [text-transform:var(--wordmark-case,none)]",
      )}
    >
      <Mark big={big} />
      <span className="truncate">
        {mark}
        {rest && (
          <span className="ml-2 font-body text-[0.72em] font-medium tracking-normal normal-case opacity-80">
            {rest}
          </span>
        )}
      </span>
    </span>
  );
}
