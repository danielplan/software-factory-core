// The made-up data a prototype's variant can be shown with (empty, loading,
// a problem …), as the maker said: a labelled row of segments under the
// variants; the one picked goes into the address (?state=<name>), so the app
// shows it. The first segment is the data it opens with.

import { Segment, SwitchRow } from "./prototype-switches";
import { useTranslation } from "react-i18next";

export function States({
  states,
  shown,
  onPick,
}: Readonly<{
  states: string[];
  shown: string;
  onPick: (state: string) => void;
}>) {
  const t = useTranslation().t;
  if (states.length === 0) return null;
  return (
    <SwitchRow label={t("explore.board.data")} role="group">
      {[
        ["", t("explore.board.usualState")],
        ...states.map((name) => [name, name]),
      ].map(([name = "", label]) => (
        <Segment
          key={name || "usual"}
          on={shown === name}
          onPick={() => {
            onPick(name);
          }}
        >
          {label}
        </Segment>
      ))}
    </SwitchRow>
  );
}
