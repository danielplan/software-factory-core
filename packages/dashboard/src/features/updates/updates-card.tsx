// Updates on Settings: whether a newer version of the project is on GitHub,
// Update to take it (only when nothing here can be lost), Look again, and
// the "Update by itself" switch. What is in the way is named in plain words.

import { Download, Monitor, RefreshCw } from "lucide-react";
import { useState } from "react";

import { messageOf, post } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRead } from "@/api/query";
import { updatesViewSchema } from "@/api/schemas/updates";
import { Markdown } from "@/components/markdown";

import { useLanguage } from "@/i18n/use-t";
import { messagesIn } from "@/i18n/messages";

import { updatesSummary } from "./updates-model";

export function UpdatesCard() {
  const { data } = useRead("/api/updates", updatesViewSchema);
  const [problem, setProblem] = useState<string | null>(null);
  const { locale } = useLanguage();
  const m = messagesIn(locale);
  if (!data) return null;
  const summary = updatesSummary(data, { m, locale });
  const press = (path: string, body: object = {}) => {
    setProblem(null);
    post(path, body).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-[15px] font-medium">
          {summary.title}
        </span>
        {summary.canUpdate && (
          <Button
            size="pill"
            onClick={() => {
              press("/api/updates/update");
            }}
          >
            <Download aria-hidden />
            {m("updates.update")}
          </Button>
        )}
        <Button
          size="pill"
          variant="ring"
          disabled={data.looking || data.updating}
          onClick={() => {
            press("/api/updates/look");
          }}
        >
          <RefreshCw aria-hidden className="size-4" /> {m("updates.lookAgain")}
        </Button>
        <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Switch
            checked={data.byItself}
            onCheckedChange={(on) => {
              press("/api/updates/by-itself", { on });
            }}
          />
          {m("updates.byItself")}
        </label>
      </div>
      {summary.text && (
        <div className="text-[13px] text-muted-foreground">
          <Markdown text={summary.text} />
        </div>
      )}
      {summary.changes.length > 0 && (
        <ul className="list-disc pl-5 text-[13px]">
          {summary.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}
      {summary.files.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {summary.files.map((file) => (
            <li key={file}>
              <code>{file}</code>
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
    </div>
  );
}

// Desktop start: a file on the desktop that opens the factory with a
// double-click, for owners who do not use a terminal.
export function DesktopStart() {
  const [said, say] = useState<string | null>(null);
  const m = messagesIn(useLanguage().locale);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-0 flex-1 text-[15px]">
        {said ?? m("updates.desktop.say")}
      </span>
      <Button
        size="pill"
        variant="ring"
        onClick={() => {
          post<{ file: string }>("/api/desktop-start").then(
            ({ file }) => {
              say(m("updates.desktop.put", { file }));
            },
            (error: unknown) => {
              say(messageOf(error));
            },
          );
        }}
      >
        <Monitor aria-hidden />
        {m("updates.desktop.button")}
      </Button>
    </div>
  );
}
