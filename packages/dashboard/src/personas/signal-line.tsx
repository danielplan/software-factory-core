// A signal in a list on a persona's or a mission's page: where it came
// from (or the mission's step it happened at), its text, when and what
// became of it, and its type.

import type { SignalRow } from "@/api";
import { ROW, SourceIcon, TypeChip } from "@/signals/bits";
import { agoOf, SOURCE_WORDS, statusWords } from "@/signals/view";
import { Markdown } from "@/components/markdown";

export function SignalLine({
  signal,
  where = null,
}: Readonly<{ signal: SignalRow; where?: string | null }>) {
  return (
    <div className={ROW}>
      <SourceIcon source={signal.source} size={32} />
      <span className="grid min-w-0 flex-1">
        <Markdown text={signal.text} inline />
        <span className="text-[12.5px] text-muted-foreground">
          {where ?? SOURCE_WORDS[signal.source]} ·{" "}
          {agoOf(signal.at, new Date())} · {statusWords(signal)}
        </span>
      </span>
      <TypeChip type={signal.type} />
    </div>
  );
}
