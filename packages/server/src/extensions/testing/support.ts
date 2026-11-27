// Testing's plug into Sprocket: a test the team asked for, with the story
// and days Mimic writes. Heard only while Testing is installed.

import { z } from "zod";

import { handOff, type SupportPlug } from "../../kobble/support-plug.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import type { TestRuns } from "./runs.ts";

const GUIDE = `**Testing** (\`#testing\`): a persona lives a few days in the app, the way a customer would, and what they run into comes back as signals. Mimic, the tester, writes their story (who they are, how they work without the app, what they bring) and their days, then lives them through a browser on this computer, never the live app. A test: say back who it is for, and once they agree, \`start_test\` has Mimic write the story and the days and sends the persona off; it takes them to the test.`;

export function testingPlug(on: {
  personas: () => PersonasPlug | null;
  runs: Pick<TestRuns, "draft" | "start">;
  changed: (what: string) => void;
}): SupportPlug {
  return {
    extension: "testing",
    pages: ["testing"],
    guide: GUIDE,
    handOffs: [
      handOff({
        name: "start_test",
        description:
          "Has Mimic write a persona's story and days and sends them off to live them in the app; takes the person to the test. Only once they agreed to who is tested.",
        input: {
          persona: z
            .string()
            .describe("A persona's id from list_personas (Personas)."),
        },
        run: async ({ persona }) => {
          const draft = await on.runs.draft(persona);
          const test = on.runs.start({ persona, ...draft });
          on.changed("tests");
          return {
            said: `Sent ${on.personas()?.get(persona)?.name ?? persona} off: ${test.title}.`,
            to: `#testing/${test.id}`,
          };
        },
      }),
    ],
  };
}
