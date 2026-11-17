// The chat's routes: a file attached (attachments.ts), a question answered
// or an idea written with the files a message came with, and a job of the
// kobold stopped, so a person can steer it: the page then asks again with
// what they added. Like every button, a POST is answered only from the
// factory's page (server.ts).

import { z } from "zod";

import type { Route } from "../add-ons/add-on.ts";
import { field } from "../asked.ts";
import type { Kobold } from "../kobold/kobold.ts";
import { parsed } from "../records/person.ts";
import { whoIs } from "../records/who.ts";
import { attachedLines, filesSchema, storeAttachment } from "./attachments.ts";

// The dashboard's language: the kobold answers, and writes an idea, in it.
const LANGUAGES = {
  en: "English",
  it: "Italian",
  de: "German",
  fr: "French",
  es: "Spanish",
} as const;
const languageSchema = z
  .enum(Object.keys(LANGUAGES) as [keyof typeof LANGUAGES])
  .optional();

const questionSchema = z.strictObject({
  question: z.string().trim().min(1),
  files: filesSchema,
  language: languageSchema,
});

const ideaSchema = z.strictObject({
  text: z.string().trim().min(1),
  persona: z.string().min(1),
  files: filesSchema,
  language: languageSchema,
});

// The line that asks for the person's language, after what they attached.
function inLanguage(
  what: string,
  language: keyof typeof LANGUAGES | undefined,
): string[] {
  return language ? ["", `${what} in ${LANGUAGES[language]}.`] : [];
}

export function chatRoutes(on: {
  kobold: Kobold;
  project: string;
}): Record<string, Route> {
  const { kobold, project } = on;
  return {
    "POST /api/chat/attachments": (body) => ({
      file: storeAttachment(project, body),
    }),
    "POST /api/chat/question": async (body) => {
      const { question, files, language } = parsed(
        questionSchema,
        body,
        "question",
      );
      const more = [
        ...attachedLines(project, files),
        ...inLanguage("Answer", language),
      ];
      return { answer: await kobold.answer(question, more) };
    },
    "POST /api/chat/idea": async (body) => {
      const { text, persona, files, language } = parsed(
        ideaSchema,
        body,
        "idea",
      );
      const attached = [
        ...attachedLines(project, files),
        ...inLanguage("Write the idea and its story", language),
      ];
      const by = await whoIs(project);
      return { job: kobold.imagine({ text, persona, by }, attached) };
    },
    "POST /api/chat/stop": (body) => {
      kobold.stop(field(body, "job"));
    },
  };
}
