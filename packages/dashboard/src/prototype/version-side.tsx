// Beside the version shown, in a card of its own: Main and every version of
// the idea (the one shown highlighted, each with what it is doing), then a
// small chat with the kobold, like the Chat page: say what another version
// should do and it makes it on its own branch, its reply following the work
// until the version is ready to see. Nobody sees a version on Explore until
// it is shared.

import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type PrototypePage, type VersionRun } from "@/api";
import { Button } from "@/components/ui/button";
import { runOf, runWords } from "@/explore/view";
import { prototypeHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { Asks, type Asked } from "./asks";

// What was asked of the kobold for each idea, kept while the page is open.
const asked = new Map<string, Asked[]>();

export function VersionSide({
  page,
  runs,
  shown,
}: Readonly<{
  page: PrototypePage;
  runs: VersionRun[];
  shown: string | null;
}>) {
  const idea = page.idea.id;
  const [asks, setAsks] = useState<Asked[]>(() => asked.get(idea) ?? []);
  const change = (how: (all: Asked[]) => Asked[]) => {
    setAsks((all) => {
      const now = how(all);
      asked.set(idea, now);
      return now;
    });
  };
  const ask = async (text: string) => {
    const id = Date.now();
    change((all) => [...all, { id, text, key: null, problem: null }]);
    try {
      const { version } = await post<{ version: { key: string } }>(
        "/api/prototypes/make",
        { idea, text },
      );
      change((all) =>
        all.map((one) => (one.id === id ? { ...one, key: version.key } : one)),
      );
    } catch (error) {
      const problem = messageOf(error);
      change((all) =>
        all.map((one) => (one.id === id ? { ...one, problem } : one)),
      );
    }
  };
  return (
    <aside className="grid min-h-[60dvh] animate-enter grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] bg-card shadow-float lg:min-h-0">
      <Versions page={page} runs={runs} shown={shown} />
      <Asks idea={idea} asks={asks} runs={runs} />
      <div className="border-t border-border-soft p-3">
        <AskField onAsk={(text) => void ask(text)} />
      </div>
    </aside>
  );
}

function Versions({
  page,
  runs,
  shown,
}: Readonly<{
  page: PrototypePage;
  runs: VersionRun[];
  shown: string | null;
}>) {
  const { t } = useTranslation("explore");
  const rows = [
    { key: null, name: t("side.mainName"), state: "" },
    ...page.versions.map((v) => ({
      key: v.key,
      name: v.name,
      state: v.sharedAt
        ? t("side.stateShared", {
            state: runWords(runOf(runs, page.idea.id, v.key)),
          })
        : runWords(runOf(runs, page.idea.id, v.key)),
    })),
  ];
  return (
    <nav
      aria-label={t("side.versions")}
      className="grid max-h-[40dvh] gap-0.5 overflow-y-auto border-b border-border-soft p-3"
    >
      <h2 className="px-2.5 pb-1.5 text-section">{t("side.versions")}</h2>
      {rows.map((row) => (
        <a
          key={row.key ?? "main"}
          href={prototypeHash(page.idea.id, row.key ?? undefined)}
          aria-current={row.key === shown ? "page" : undefined}
          className={cn(
            "grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 rounded-xl px-2.5 py-2 text-body transition-[background-color,box-shadow] hover:bg-hover",
            row.key === shown && "bg-tint ring-1 ring-primary/40 hover:bg-tint",
          )}
        >
          <b>{row.key ?? t("version.main")}</b>
          <span className="truncate">{row.name}</span>
          {row.state && (
            <span className="col-start-2 text-tag text-muted-foreground">
              {row.state}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

// Where the person writes what the next version should do: Enter sends,
// Shift+Enter starts a line.
function AskField({ onAsk }: Readonly<{ onAsk: (text: string) => void }>) {
  const { t } = useTranslation("explore");
  const [text, setText] = useState("");
  const send = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!text.trim()) return;
    onAsk(text.trim());
    setText("");
  };
  return (
    <form
      onSubmit={send}
      className="flex items-end gap-2 rounded-2xl border border-border bg-card p-1.5 pl-3 transition-shadow focus-within:border-ring/60 focus-within:ring-[3px] focus-within:ring-ring/20"
    >
      <textarea
        aria-label={t("side.askLabel")}
        value={text}
        rows={2}
        placeholder={t("side.askPlaceholder")}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) send(event);
        }}
        className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-1.5 text-body outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon"
        aria-label={t("side.send")}
        disabled={!text.trim()}
        className="rounded-xl"
      >
        <ArrowUp aria-hidden />
      </Button>
    </form>
  );
}
