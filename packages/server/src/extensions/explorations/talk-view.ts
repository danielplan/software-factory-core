// What the page shows of the conversation with the kobold about an
// exploration: what was said, the answer while it is written, what the
// kobold does, how far it got, why it could not answer, and what it points at.

import type { Step, Talk } from "../../coach/talk.ts";

export type TalkView = {
  messages: { from: "kobold" | "you"; text: string }[];
  writing: string | null;
  activity: string | null;
  // The step the explorer is at in this turn, from what it reported: 0
  // reading what it was given, 1 looking through the code, 2 drawing.
  step: Step;
  problem: string | null;
  // The thing the kobold points at, and how many times it pointed (so the
  // page moves there again when it points at the same thing).
  pointed: { thing: string; times: number } | null;
};

// The conversation as shown; `kept` is what was said before the server
// started, when no talk is open yet.
export function viewOf(
  talk: Talk | undefined,
  kept: TalkView["messages"],
  pointed: TalkView["pointed"],
): TalkView {
  if (!talk)
    return {
      messages: kept,
      writing: null,
      activity: null,
      step: 0,
      problem: null,
      pointed: null,
    };
  return {
    messages: talk.messages.map((m) => ({
      from: m.from === "coach" ? "kobold" : "you",
      text: m.text,
    })),
    writing: talk.writing,
    activity: talk.activity,
    step: talk.step,
    problem: talk.problem,
    pointed,
  };
}
