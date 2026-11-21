// Variant B, Settings › Updates: calm while GitHub cannot be reached. The
// header says which Kobble this is (or that a newer one is ready), a small
// grey note says when it last looked, with Try again beside it; the release
// list below comes from this computer's copy, so needs no GitHub.

import { RefreshCw } from "lucide-react";

import { useLanguage } from "@/i18n/use-t";
import type { Locale } from "@/i18n/locale";
import { Switch } from "@/components/ui/switch";

import type { UpdatesView } from "../../../server/src/updates/served.ts";
import { CURRENT } from "./changelog-data";
import { ReleaseList } from "./release-list";

const WORDS = {
  en: {
    on: (v: string) => `You're on Kobble ${v}`,
    ready: (v: string) => `Kobble ${v} is on its way: it arrives by itself`,
    failed: "Couldn't check for newer versions just now",
    ok: "Up to date",
    checking: "Checking for newer versions…",
    checked: (when: string) => ` · checked ${when}`,
    again: "Try again",
    byItself: "Update by itself",
    byItselfAbout: "Takes new versions when nothing here can be lost",
  },
  it: {
    on: (v: string) => `Stai usando Kobble ${v}`,
    ready: (v: string) => `Kobble ${v} sta arrivando: arriva da solo`,
    failed: "Non è stato possibile cercare versioni più nuove",
    ok: "Aggiornato",
    checking: "Cerco versioni più nuove…",
    checked: (when: string) => ` · controllato ${when}`,
    again: "Riprova",
    byItself: "Aggiorna da solo",
    byItselfAbout:
      "Prende le nuove versioni quando qui non si può perdere nulla",
  },
  de: {
    on: (v: string) => `Du nutzt Kobble ${v}`,
    ready: (v: string) => `Kobble ${v} ist unterwegs: es kommt von selbst`,
    failed: "Neuere Versionen konnten gerade nicht geprüft werden",
    ok: "Auf dem neuesten Stand",
    checking: "Suche nach neueren Versionen…",
    checked: (when: string) => ` · geprüft ${when}`,
    again: "Erneut versuchen",
    byItself: "Von selbst aktualisieren",
    byItselfAbout:
      "Übernimmt neue Versionen, wenn hier nichts verloren gehen kann",
  },
};

// "5 minutes ago", in the language shown.
function ago(locale: Locale, at: string): string {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(at).getTime()) / 60_000),
  );
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return format.format(-minutes, "minute");
  if (minutes < 1440) return format.format(-Math.round(minutes / 60), "hour");
  return format.format(-Math.round(minutes / 1440), "day");
}

export function CalmUpdates({
  data,
  press,
}: Readonly<{
  data: UpdatesView;
  press: (path: string, body?: object) => void;
}>) {
  const { locale } = useLanguage();
  const w = WORDS[locale];
  const { newest } = data.release;
  const when = data.lastLookAt ? w.checked(ago(locale, data.lastLookAt)) : "";
  let note = `${w.ok}${when}`;
  if (data.looking) note = w.checking;
  else if (data.offline) note = `${w.failed}${when}`;
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 text-[15px] font-medium">
            {newest ? w.ready(newest) : w.on(CURRENT)}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="[overflow-wrap:anywhere]">{note}</span>
          <button
            type="button"
            disabled={data.looking || data.updating}
            onClick={() => {
              press("/api/updates/look");
            }}
            className="inline-flex items-center gap-1 text-blue hover:underline disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden
              className={`size-3 ${data.looking ? "animate-spin" : ""}`}
            />
            {w.again}
          </button>
        </p>
      </div>
      <ItselfRow data={data} press={press} />
      <ReleaseList newest={newest} />
    </div>
  );
}

// Its own settings row, set apart by a thin line: the label and a grey
// line about it on the left, the switch at the right edge.
export function ItselfRow({
  data,
  press,
}: Readonly<{
  data: UpdatesView;
  press: (path: string, body?: object) => void;
}>) {
  const w = WORDS[useLanguage().locale];
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-3">
      <div className="grid min-w-0 gap-0.5">
        <span id="by-itself" className="text-[13px] font-medium">
          {w.byItself}
        </span>
        <span className="text-xs text-muted-foreground">{w.byItselfAbout}</span>
      </div>
      <Switch
        aria-labelledby="by-itself"
        className="flex-none"
        checked={data.byItself}
        onCheckedChange={(on) => {
          press("/api/updates/by-itself", { on });
        }}
      />
    </div>
  );
}
