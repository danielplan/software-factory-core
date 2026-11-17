// The conversation and what the kobold does with each message: a question
// is answered, an idea asks who it is for and is then written up; while it
// works, a new message steers it (the work is stopped and asked again with
// what was added). It stays while the page is open, across the dashboard's
// pages; New chat clears it.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type KoboldJob, messageOf, type PersonaTag, post } from "@/api";
import {
  type Busy,
  filesOf,
  replyTo,
  type Request,
  type Said,
  type Saying,
  type Sent,
  steered,
} from "@/lib/chat-view";

import { refusalWords } from "./refusals";

let kept: Said[] = [];
let next = 1;

function useConversation() {
  const [said, setSaid] = useState<Said[]>(kept);
  const change = (how: (all: Said[]) => Said[]) => {
    setSaid((all) => {
      kept = how(all);
      return kept;
    });
  };
  const add = (one: Saying, id = next++) => {
    change((all) => [...all, { ...one, id }]);
  };
  const replace = (id: number, one: Saying) => {
    change((all) =>
      all.map((each) => (each.id === id ? { ...one, id } : each)),
    );
  };
  const clear = () => {
    change(() => []);
  };
  return { said, add, replace, clear };
}

// Asks the kobold: an answer, in the message at `at`, or an idea's job;
// a question stopped to be steered says so there, not why it failed.
// The kobold answers, and writes an idea, in the dashboard's language.
function useAsk(conversation: ReturnType<typeof useConversation>) {
  const { add, replace } = conversation;
  const { t, i18n } = useTranslation("chat");
  const { language } = i18n;
  const sorry = (error: unknown) =>
    t("failed", { why: refusalWords(messageOf(error)) });
  const replaceIfStill = (at: number, one: Saying) => {
    if (kept.some((each) => each.id === at && "thinking" in each))
      replace(at, one);
  };
  return async (asked: Request, at = next++) => {
    if (asked.kind === "question") {
      add({ by: "kobold", thinking: true, asked }, at);
      try {
        const reply = await post<{ answer: string }>("/api/chat/question", {
          question: asked.question,
          files: filesOf(asked.files),
          language,
        });
        replaceIfStill(at, { by: "kobold", text: reply.answer });
      } catch (error) {
        replaceIfStill(at, { by: "kobold", text: sorry(error) });
      }
      return;
    }
    try {
      const { job } = await post<{ job: KoboldJob }>("/api/chat/idea", {
        text: asked.text,
        persona: asked.persona,
        files: filesOf(asked.files),
        language,
      });
      add({ by: "kobold", job: job.id, asked }, at);
    } catch (error) {
      add({ by: "kobold", text: sorry(error) }, at);
    }
  };
}

export function useChat(people: PersonaTag[]) {
  const { t } = useTranslation("chat");
  const conversation = useConversation();
  const { said, add, replace, clear } = conversation;
  const ask = useAsk(conversation);
  const send = (text: string, files: Sent[]) => {
    add({ by: "me", text, files, steer: false });
    const reply = replyTo(text, people);
    if ("thinking" in reply) {
      void ask({ kind: "question", question: text, files });
      return;
    }
    add({ by: "kobold", ...reply, files });
    if (reply.chosen)
      void ask({ kind: "idea", text, persona: reply.chosen, files });
  };
  const choose = (
    id: number,
    idea: string,
    files: Sent[],
    person: PersonaTag,
  ) => {
    replace(id, { by: "kobold", choose: idea, files, chosen: person.id });
    add({
      by: "me",
      text: t("forPerson", { name: person.name }),
      files: [],
      steer: false,
    });
    void ask({ kind: "idea", text: idea, persona: person.id, files });
  };
  // Stops what the kobold works on and asks again with the guidance.
  const steer = async (busy: Busy, guidance: string, files: Sent[]) => {
    add({ by: "me", text: guidance, files, steer: true });
    replace(busy.at, { by: "kobold", text: t("steering") });
    try {
      if (busy.job) await post("/api/chat/stop", { job: busy.job });
    } catch {
      // It had finished already: what it made stays, and it is asked again.
    }
    const again = steered(busy.asked, guidance);
    void ask({ ...again, files: [...again.files, ...files] });
  };
  return { said, send, choose, steer, clear };
}
