// Why the factory refused something, in the person's language. The server
// says each refusal in one plain English sentence; the ones the chat and
// the check-up can meet are kept in English in the words of those parts
// (`refused` in chat.json and checks.json), so the sentence is found there
// and said in the dashboard's language. Any other one is shown as it came.

import { resources, t } from "../i18n/i18n.ts";

const CHAT = resources.en.chat.refused;
const CHECKS = resources.en.checks.refused;
// A file a message came with that is gone; the name is the person's own.
const GONE = { start: "The file “", end: "” is not there any more." };

function keyOf<T extends Record<string, string>>(
  words: T,
  message: string,
): keyof T | undefined {
  return (Object.keys(words) as (keyof T)[]).find(
    (key) => words[key] === message,
  );
}

export function refusalWords(message: string): string {
  const chat = keyOf(CHAT, message);
  if (chat) return t(`chat:refused.${chat}`);
  const checks = keyOf(CHECKS, message);
  if (checks) return t(`checks:refused.${checks}`);
  if (message.startsWith(GONE.start) && message.endsWith(GONE.end))
    return t("chat:gone", {
      name: message.slice(GONE.start.length, -GONE.end.length),
    });
  return message;
}
