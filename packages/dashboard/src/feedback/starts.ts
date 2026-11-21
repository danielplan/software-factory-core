// The window's first lines and its quick replies.
export const START = {
  startBug: {
    line: "Sorry about that. What went wrong?",
    examples: [
      "The builder stopped halfway",
      "My cards don't show",
      "A page shows an error",
    ],
  },
  startWish: {
    line: "Tell me what you wish Kobble could do.",
    examples: [
      "Work on two cards at once",
      "See signals from Slack",
      "Export the board",
    ],
  },
  startAsk: {
    line: "What would you like to know?",
    examples: [
      "How do I start a build?",
      "What is a persona?",
      "Where do signals come from?",
    ],
  },
};

export const REPLIES: Partial<Record<string, string[]>> = {
  askWish: ["It would save me time", "My team keeps asking"],
  askBug: ["I clicked Build", "It happened by itself"],
  askError: ["I moved a card to Build", "Nothing, it just stopped"],
};
