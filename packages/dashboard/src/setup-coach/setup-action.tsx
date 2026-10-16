import { useState } from "react";

import { type CoachView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

// The one step the owner takes in setup, below the chat: once the map shows
// something, have the coach build the factory as planned; once it is
// built, open it (the page becomes its dashboard).
export function SetupAction({
  coach,
  onPress,
}: Readonly<{
  coach: CoachView;
  // Pressed: the voice call ends.
  onPress: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const building = coach.phase === "build";
  if (building && !coach.made) return null;
  if (!building && coach.draft.cards.length === 0) return null;
  const press = async () => {
    onPress();
    setBusy(true);
    setProblem(null);
    try {
      await post(building ? "/api/setup/open" : "/api/setup/build");
    } catch (error) {
      setProblem(messageOf(error));
    }
    setBusy(false);
  };
  return (
    <div className="grid gap-3">
      {problem && <ProblemBox title="That did not work" text={problem} />}
      <Button
        className="h-11 w-full px-[22px]"
        disabled={coach.working || busy}
        onClick={() => void press()}
      >
        {building ? "Open the factory" : "Build the factory"}
      </Button>
    </div>
  );
}
