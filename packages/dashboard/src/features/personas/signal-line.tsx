// A signal in a list on a persona's or a mission's page: where it came
// from (or the mission's step it happened at), its text, when and what
// became of it, and its type.

import type { SignalRow } from "@/api/client";
import { ROW, SourceIcon, TypeChip } from "@/components/page-bits";
import { agoOf, statusWords } from "@/lib/signals-view";
import { Markdown } from "@/components/markdown";
import { useT } from "@/i18n/use-t";

export function SignalLine({
  signal,
  where = null,
}: Readonly<{ signal: SignalRow; where?: string | null }>) {
  const t = useT();
  return (
    <div className={ROW}>
      <SourceIcon source={signal.source} size={32} />
      <span className="grid min-w-0 flex-1">
        <Markdown text={signal.text} inline />
        <span className="text-[12.5px] text-muted-foreground">
          {where ?? t.words.sources[signal.source]} ·{" "}
          {agoOf(signal.at, new Date(), t.words)} ·{" "}
          {statusWords(signal, t.words)}
        </span>
      </span>
      <TypeChip type={signal.type} />
    </div>
  );
}
