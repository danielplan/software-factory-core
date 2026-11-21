// Feedback in English (feedback.ts).

// A long error cut short for a title.
export const clip = (text: string) =>
  text.length > 70 ? `${text.slice(0, 70)}…` : text;

export const feedbackEnglish = {
  row: "Send feedback",
  hit: "The factory hit an error",
  notNow: "Not now",
  report: "Report this error",
  errorTitle: (text: string) => `Error: ${clip(text)}`,
  reportTitle: "Report this error",
  reportIntro:
    "The details are filled in. Add a few words on what you were doing; you see all of it before it goes out.",
  title: "Send feedback to the makers of Kobble",
  intro:
    "A wish or something wrong, in a few words. It goes on the public feedback board on GitHub, where the makers answer. Your code and your product stay private.",
  kinds: { bug: "Something is wrong", wish: "I wish…" },
  short: "In one line",
  shortBug: "The builder stops when…",
  shortWish: "It would help if…",
  what: "What you were doing, and what you expected",
  whatWish: "What you wanted to do, and why",
  withErrors: "Errors the factory caught, to send with it",
  toCheck: "See what goes out",
  cancel: "Cancel",
  checkTitle: "This is all that goes out",
  checkIntro: (board: string) =>
    `Word for word, as it will be on the public board (${board}). Change anything, or remove a part.`,
  teamData:
    "Errors can carry your team's data: names, repositories, card titles. The board is public, so change or remove what should stay with you.",
  partTitle: "Title",
  partText: "What you wrote",
  partWhere: "Where",
  pageWord: "page",
  partError: (at: string) => `Error at ${at}`,
  remove: "Remove",
  putBack: "Put back",
  nothingElse:
    "Nothing else is sent: no files, no code, no data from your product.",
  sendsAs: "Sent with your GitHub account",
  notYou: "Not you?",
  signInFirst: "Sent with your own GitHub account.",
  signIn: "Sign in with GitHub",
  back: "Back",
  send: "Send to the board",
  thanks: "Thank you, it is on the board",
  onBoard: "The makers read it there; other teams can add a 👍.",
  follow:
    "You see here how it stands: seen when the makers have read it, planned when they will do it, done when it is in a new Kobble.",
  another: "Send another",
  close: "Close",
  states: { sent: "Sent", seen: "Seen", planned: "Planned", done: "Done" },
  stateHelp: {
    sent: "On the board, not read yet",
    seen: "The makers have read it",
    planned: "The makers will do it",
    done: "It is in a new Kobble",
  },
  filterAll: "All",
  filterFeedback: "Feedback",
  you: "You",
  change: "Change",
  noPersona: "No persona yet",
  personaSure: (name: string, why: string) =>
    `Sprocket thinks this is ${name}: ${why}.`,
  personaPicked: (name: string) => `You said this is ${name}.`,
  personaUnsure: "Sprocket isn't sure who this is.",
  teamsWant: (n: number) =>
    n === 1 ? "👍 1 team wants this" : `👍 ${String(n)} teams want this`,
  mine: "Yours on the board",
  board: "See the board",
  similar: "Already on the board",
  similarHelp: "If one is yours, add a 👍 instead of a new one.",
  thumbs: (n: number) => `👍 ${String(n)}`,
  chat: {
    placeholder: "I wish I could…, or: it stops when…",
    hint: "A wish, or something wrong? Just tell me in your own words: I write it up for the makers of Kobble.",
    invite:
      "Tell me in your own words: something you wish Kobble did, or something that went wrong. I write it up for its makers, on their public board.",
    askWish:
      "Good one. What would you do with it? A moment from your work helps the makers most.",
    askBug:
      "Sorry about that. What were you doing when it happened, and what did you expect?",
    askError: (error: string) =>
      `The factory hit this error:\n\n\`${error}\`\n\nWhat were you doing when it happened?`,
    askAgain: "Does it happen every time?",
    again: ["Every time", "Only once", "Not sure"],
    skip: "Skip",
    similar: (teams: number) =>
      `${String(teams)} teams want this too. Add your 👍 instead of a new post?`,
    similarBug: (teams: number) =>
      `${String(teams)} teams ran into this too. Add your 👍 instead of a new post?`,
    addThumb: "Add my 👍",
    different: "Mine is different",
    thumbed: (n: number) =>
      `Your 👍 is on #${String(n)}. I tell you here when it moves.`,
    draft:
      "Here is what I would send. Change anything, or tell me what to add.",
    draftTeam:
      "I marked what looks like your team's data (names, repositories, card titles). The board is public: click a mark to take it out.",
    added: "Added that to the description.",
    kindWord: { bug: "Bug", wish: "Wish" },
    description: "Description",
    goesAlong: "Goes along",
    version: "Version",
    page: "Page",
    taken: "[taken out]",
    send: "Send",
    posted: (n: number) =>
      `Sent as #${String(n)} on the public board. I follow it here: seen, planned, done.`,
    moved: {
      sent: (n: number) => `#${String(n)} is on the board.`,
      seen: (n: number) => `The makers have read #${String(n)}.`,
      planned: (n: number) =>
        `#${String(n)} is planned: the makers will do it.`,
      done: (n: number) => `#${String(n)} is done: it is in a new Kobble.`,
    },
  },
  // Sprocket's window: the opening, the post building itself, the chat.
  window: {
    howCanIHelp: "How can I help?",
    reportIt: "Report it",
    choices: {
      bug: "Something is wrong",
      wish: "I wish Kobble could…",
      ask: "Ask a question",
    },
    here: {
      home: { text: "Missing something on Home? Tell me" },
      system: {
        text: "A product looks wrong? Report it",
        said: "A product on the System page looks wrong",
      },
      signals: { text: "Missing a kind of signal? Tell me" },
      explore: {
        text: "Prototype not what you asked? Report it",
        said: "A prototype doesn't show what I asked for",
      },
      build: {
        text: "Builder stopped? Report it",
        said: "The builder stopped",
      },
      personas: { text: "Wish personas did more? Tell me" },
      settings: { text: "Can't find a setting? Ask me" },
    },
    starts: {
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
    },
    replies: {
      askWish: ["It would save me time", "My team keeps asking"],
      askBug: ["I clicked Build", "It happened by itself"],
      askError: ["I moved a card to Build", "Nothing, it just stopped"],
    },
    lines: {
      askError:
        "I put the error in the post above. What were you doing when it happened?",
      draft: "Here it is, above. Change anything, or send it.",
      added: "Added it to the post.",
      cleaned: "Done: your team's data is out.",
    },
    askBugAfterSorry:
      "What were you doing when it happened, and what did you expect?",
    similar: (teams: number, bug: boolean) =>
      `${String(teams)} teams ${bug ? "ran into this too" : "want this too"}:`,
    thumbed: (n: number) =>
      `Your 👍 is on #${String(n)}. I'll follow it above.`,
    posted: (n: number) => `Sent as #${String(n)}. I'll follow it above.`,
    placeholders: {
      choose: "Ask, or tell me what's wrong…",
      ask: "Ask a question…",
      listen: "Say it in your own words…",
      question: "Your answer…",
      again: "Your answer…",
      similar: "Or tell me more…",
      draft: "Tell me what to change…",
      sent: "Anything else?",
    },
    takeOut: "Take out my team's data",
    addDetail: "Add a detail",
    somethingElse: "Something else",
    startOver: "Start over",
    alreadyOnBoard: "Already on the board?",
    kinds: { bug: "Bug", wish: "Wish" },
    newPost: "new post",
    ready: "Ready to send",
    writing: "Writing itself…",
    titleLabel: "Title",
    errorPrefix: "error: ",
    publicBoard: (remove: string) => `${remove}: the board is public`,
    signedInAs: (name: string) => `as @${name}`,
    withSignIn: "with your GitHub sign-in",
    send: "Send",
    sendPost: "Send the post",
    typeBefore: "Type",
    typeAfter: "at github.com/login/device, then I send it.",
    sendMessage: "Send your message",
  },
};
