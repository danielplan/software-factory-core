// The made-up data a prototype's variant can be shown with (empty, loading,
// a problem …), as the maker said: a labelled row of segments under the
// variants; the one picked goes into the address (?state=<name>), so the app
// shows it. The first segment is the data it opens with.

import { useT } from "@/i18n/use-t";

import { Segment, SwitchRow } from "./prototype-switches";

export function States({
  states,
  shown,
  onPick,
}: Readonly<{
  states: string[];
  shown: string;
  onPick: (state: string) => void;
}>) {
  const t = useT().explore.board;
  if (states.length === 0) return null;
  return (
    <SwitchRow label={t.data} role="group">
      {[["", t.usualState], ...states.map((name) => [name, name])].map(
        ([name = "", label]) => (
          <Segment
            key={name || "usual"}
            on={shown === name}
            onPick={() => {
              onPick(name);
            }}
          >
            {label}
          </Segment>
        ),
      )}
    </SwitchRow>
  );
}
