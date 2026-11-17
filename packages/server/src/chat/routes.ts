// The chat's routes: a file attached (attachments.ts), a question answered
// or an idea written with the files a message came with, and a job of the
// kobold stopped, so a person can steer it: the page then asks again with
// what they added. Like every button, a POST is answered only from the
// factory's page (server.ts). What does not fit is refused in a plain
// sentence (fitted.ts).

import { z } from "zod";

import type { Route } from "../add-ons/add-on.ts";
import type { Kobold } from "../kobold/kobold.ts";
import { whoIs } from "../records/who.ts";
import { Refused } from "../refused.ts";
import { attachedLines, filesSchema, storeAttachment } from "./attachments.ts";
import { fitted, SAID } from "./fitted.ts";

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

const stopSchema = z.strictObject({ job: z.string().min(1) });

// An answer to a question; when it was stopped (a person steering it), the
// job's own reason, not why Claude Code ended.
async function answered(
  kobold: Kobold,
  question: string,
  more: string[],
): Promise<string> {
  const before = new Set(kobold.view().map((job) => job.id));
  try {
    return await kobold.answer(question, more);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    const job = kobold
      .view()
      .find(
        (one) =>
          !before.has(one.id) &&
          one.kind === "answer" &&
          one.about === question.trim(),
      );
    throw new Refused(job?.problem ?? error.message);
  }
}

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
      const { question, files, language } = fitted(questionSchema, body, SAID);
      const more = [
        ...attachedLines(project, files),
        ...inLanguage("Answer", language),
      ];
      return { answer: await answered(kobold, question, more) };
    },
    "POST /api/chat/idea": async (body) => {
      const { text, persona, files, language } = fitted(ideaSchema, body, SAID);
      const attached = [
        ...attachedLines(project, files),
        ...inLanguage("Write the idea and its story", language),
      ];
      const by = await whoIs(project);
      return { job: kobold.imagine({ text, persona, by }, attached) };
    },
    "POST /api/chat/stop": (body) => {
      kobold.stop(fitted(stopSchema, body, { job: SAID.otherwise }).job);
    },
  };
}
