// A signal in a list on a persona's or a test's page: where it came from,
// its text, when and what became of it, and its type.

import type { SignalRow } from "@/api";
import { ROW, SourceIcon, TypeChip } from "@/signals/bits";
import { agoOf, SOURCE_WORDS, statusWords } from "@/signals/view";

export function SignalLine({ signal }: Readonly<{ signal: SignalRow }>) {
  return (
    <div className={ROW}>
      <SourceIcon source={signal.source} size={32} />
      <span className="grid min-w-0 flex-1">
        <span>{signal.text}</span>
        <span className="text-[12.5px] text-muted-foreground">
          {SOURCE_WORDS[signal.source]} · {agoOf(signal.at, new Date())} ·{" "}
          {statusWords(signal)}
        </span>
      </span>
      <TypeChip type={signal.type} />
    </div>
  );
}
