// Kobble's releases as the core's CHANGELOG.md writes them (made-up
// copies in the same format, English as in the file): a "## version
// (date)" heading, a "**To upgrade:**" paragraph, then entries starting
// "New:", "Changed:" or "Fixed:". The list is what this computer's copy of
// Kobble knows, so it needs no GitHub. CURRENT is the version it runs.

export const CURRENT = "0.13.2";

// A version GitHub could tell about (the newest one found, made up).
export const FOUND = `## NEWEST (2026-11-28)

**To upgrade:** pin \`release-NEWEST\`, \`npm install\`, \`npx software-factory upgrade\`. Nothing else to do.

- New: **what changed, in the dashboard**: Settings › Updates lists each release as it is written in the [changelog](https://github.com/software-factory/core/blob/main/CHANGELOG.md), newest first, with what a team has to do. Nothing to do.
- Fixed: a card opened beside the board no longer closes when the builder reads the board again. Nothing to do.
`;

export const CHANGELOG = `## 0.13.2 (2026-11-21)

**To upgrade:** pin \`release-0.13.2\`, \`npm install\`, \`npx software-factory upgrade\`. Nothing else to do; a team that reads the public feedback board (\`FACTORY_FEEDBACK_READS=yes\`) upgrades all its computers together.

- Changed: the core's own factory keeps its explorations out of git (\`factory/kobble/explorations/\` in its \`.gitignore\`), since this repository is public; they stay on the computer they were made on. A company's factory still shares its explorations through git. Nothing to do.
- Changed: the knowledge base is kept with the code. Before a card's pull request, a branch that changes code but none of the knowledge files (\`docs/\`, a \`context/\` folder, a \`BLUEPRINT.md\`, \`AGENTS.md\`) gets one more round of the \`update-context\` skill, while the card is still In progress; a run file that says "Knowledge base: nothing to change, because …" lets it through. Nothing to do.
- Fixed: the words still written in English only are in Italian and German too: Sprocket's feedback window (its opening, suggestions, quick replies, the post building itself, the sign-in code, its placeholders), "All quiet" on Signals, the voice's quiet note, the explorations' small board, the setup's "Connected" and "Now:", and the labels screen readers hear in the sidebar, the tracker choice and the cards waiting for you. The post's Send and the chat's arrow have different names ("Send the post", "Send your message"). A new test, \`words-in-catalogue\`, reads every screen and fails on words written straight into it. Nothing to do.
- Fixed: a Kobble page left open while the dashboard was built again (each \`npm run verify\` in the core does) loads itself again once, instead of showing a blank canvas. Nothing to do.
- New: **send feedback from anywhere in a factory**, with nothing to host. Everything opens in Sprocket's one window: clicking "Ask Sprocket anything", "Send feedback" (sidebar) or "Report this error" (a notice in the sidebar when the factory hits an error) makes the bar grow into it. It opens only when clicked, with a short line that fits the page you are on, a waiting error as the first suggestion, and three starting choices (Something is wrong, I wish Kobble could…, Ask a question). While you talk, the post builds itself in a card at the top (title, what happened, what goes along: version, page, the errors caught); what looks like your team's data is marked and can be taken out; Sprocket offers a 👍 on a similar post of the board. One Send, with your own GitHub sign-in, puts it on the public feedback board, a GitHub repository \`<owner>/software-factory-feedback\` beside the core's own (the makers create it); afterwards the card follows its state: sent, seen, planned, done. Server: \`GET /api/feedback\`, \`POST /api/feedback/send\`, \`/thumb\` and \`/persona\`; what a person sent is kept in \`factory/settings/feedback-sent.json\`. Nothing to do. The words of the window are in English, Italian and German.
- New: **posts from the feedback board arrive as signals** in a factory that reads it (the makers' own): set \`FACTORY_FEEDBACK_READS=yes\` in \`factory/team.env\`. Other factories do not read the board. A computer on an older core cannot read signals of this source: upgrade every computer of a team that reads the board together.
- Changed: every button has an icon before its words, the same icon for the same action; a Factory card's pull request button has the colour of its state (green ready for review, grey draft or closed, purple merged, red when it clashes with main). The rules are in the [design system](docs/reference/design-system.md). Nothing to do.

## 0.13.1 (2026-11-21)

**To upgrade:** pin \`release-0.13.1\`, \`npm install\`, \`npx software-factory upgrade\`. Nothing else to do.

- New: **Resolve** on a Factory card whose pull request clashes with main. The card says "Clashes with main"; Resolve writes the ask on the card (bring in the latest main and resolve the merge conflicts) and moves it back to **To do**. The builder takes it into **In progress**, where it works: it continues on the same branch, brings in main, settles the clash, runs the checks and puts the card in Review again. Nothing to do.
- Changed: an exploration has one prototype, so one copy of the code. A new question on its board no longer starts a second prototype: its options become the prototype's variants. Copies of explorations handed off before stay until removed by hand (\`<project>-prototypes/<exploration>\`).
- Changed: the README says what Kobble is and what you can do with it, with pictures (\`docs/images/\`). Nothing to do.

## 0.13.0 (2026-11-14)

**To upgrade:** pin \`release-0.13.0\`, \`npm install\`, \`npx software-factory upgrade\`.

- Changed: an idea that changes no screen is handed off without a prototype. Nothing to do.
`;

export type Kind = "New" | "Changed" | "Fixed";
export const KINDS: Kind[] = ["New", "Changed", "Fixed"];

export type Entry = { kind: Kind; text: string; nothingToDo: boolean };
export type Release = {
  version: string;
  date: string;
  upgrade: string;
  entries: Entry[];
};

const NOTHING = /\s*Nothing to do\.$/;

export function parseChangelog(markdown: string, newest?: string): Release[] {
  return markdown
    .split(/^## /m)
    .filter((part) => part.trim())
    .map((part) => {
      const lines = part.split("\n");
      const [version, date = ""] = lines[0]!
        .replace("NEWEST", newest ?? "")
        .replace(/\)\s*$/, "")
        .split(" (");
      const upgrade =
        lines
          .find((line) => line.startsWith("**To upgrade:**"))
          ?.replace("**To upgrade:**", "")
          .trim() ?? "";
      const entries = lines.flatMap((line) => {
        const found = /^- (New|Changed|Fixed): (.*)$/.exec(line);
        if (!found) return [];
        const text = found[2]!;
        return [
          {
            kind: found[1] as Kind,
            text: text.replace(NOTHING, ""),
            nothingToDo: NOTHING.test(text),
          },
        ];
      });
      const sorted = KINDS.flatMap((kind) =>
        entries.filter((entry) => entry.kind === kind),
      );
      return { version: version!, date, upgrade, entries: sorted };
    });
}

// The first sentence or two of an entry, and the rest; a sentence ends at
// a full stop outside code, bold and links, before a capital.
export function splitEntry(text: string): { head: string; rest: string } {
  const ends: number[] = [];
  let code = false;
  let link = false;
  let bold = false;
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at]!;
    if (char === "`") code = !code;
    if (code) continue;
    if (char === "*" && text[at + 1] === "*") {
      bold = !bold;
      at += 1;
    } else if (char === "[") link = true;
    else if (char === ")" && link) link = false;
    else if (
      ".!?".includes(char) &&
      !bold &&
      !link &&
      text[at + 1] === " " &&
      /[A-Z"*`(]/.test(text[at + 2] ?? "")
    )
      ends.push(at + 1);
  }
  const first = ends[0];
  if (first === undefined) return { head: text, rest: "" };
  const cut = first < 110 && ends[1] !== undefined ? ends[1] : first;
  return { head: text.slice(0, cut), rest: text.slice(cut).trim() };
}
