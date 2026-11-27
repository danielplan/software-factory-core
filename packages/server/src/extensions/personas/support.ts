// Personas' plug into Sprocket: the personas there are, and a new one the
// team describes. Heard only while Personas is installed.

import type { KobbleStore } from "@software-factory/core";
import { z } from "zod";

import { addPersona } from "./actions.ts";
import { handOff, type SupportPlug } from "../../kobble/support-plug.ts";

export function personasText(store: KobbleStore): string {
  const personas = store.all("personas");
  if (personas.length === 0) return "No personas yet.";
  return personas
    .map((one) => `- ${one.id}: ${one.name}, ${one.place}. ${one.about}`)
    .join("\n");
}

const GUIDE = `**Personas** (\`#personas\`): the real customers the product is for; Testing sends them to live a few days in the app. A new persona: ask, one short question at a time, who they are, where they work or live and what they need from the app. Give them a made-up first name that fits where they are (Giulia in Bolzano), never a role such as Founder. Their place line says who they are and where, the way the Personas page shows it under the name (Startup founder · NOI Techpark, Bolzano). Say it back as one short line, then the persona as a block the page shows as its card:\n\n\`\`\`persona\nname: Giulia\nplace: Startup founder · NOI Techpark, Bolzano\nabout: Two or three sentences: who they are and what they need from the app.\n\`\`\`\n\nThe card has its own button to add it, so ask nothing after the block. \`add_persona\` once they agree.`;

const FIRST_NAME =
  "A made-up first name that fits the person (Giulia), never a role.";

export function personasPlug(on: {
  store: () => KobbleStore;
  changed: (what: string) => void;
}): SupportPlug {
  return {
    extension: "personas",
    pages: ["personas"],
    guide: GUIDE,
    handOffs: [
      listPersonas(on.store),
      handOff({
        name: "add_persona",
        description:
          "Adds a persona: a real kind of customer the team described. Only once the team agreed to what you will add.",
        input: {
          name: z.string().min(1).describe(FIRST_NAME),
          place: z
            .string()
            .describe(
              "Who they are and where, a few words: role · place (Bakery owner · Milan).",
            ),
          about: z
            .string()
            .describe(
              "Who they are and what they need from the app, two or three sentences.",
            ),
        },
        run: (args) => {
          const persona = addPersona(on.store(), args);
          on.changed("personas");
          return {
            said: `Added ${persona.name} (${persona.id}): #personas/${persona.id}`,
          };
        },
      }),
    ],
  };
}

function listPersonas(store: () => KobbleStore) {
  return handOff({
    name: "list_personas",
    description: "The personas there are: id, name, where, who they are.",
    run: () => ({ said: personasText(store()) }),
  });
}
