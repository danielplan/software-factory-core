// The chat with the kobold: what was said, in order, and what a message
// is. A question (it ends with "?") is answered from the records; anything
// else is something to explore, which the kobold writes up as an idea once
// it knows who it is for. Either may come with files. While the kobold
// works on one, a new message steers it: the work is stopped and asked
// again with what was added. Kept apart from the components so it is
// checked on its own.

// A file sent with a message: the name the factory gave it, the name it
// had, its type, and a picture of it to show while the page is open.
export type Sent = {
  id: string;
  name: string;
  type: string;
  preview: string | null;
};

// What was asked of the kobold, to ask again when a person steers it.
export type Request =
  | { kind: "question"; question: string; files: Sent[] }
  | { kind: "idea"; text: string; persona: string; files: Sent[] };

export type Said =
  | { id: number; by: "me"; text: string; files: Sent[]; steer: boolean }
  | { id: number; by: "kobold"; text: string }
  // Who is it for? With the people to choose from, until one is chosen.
  | {
      id: number;
      by: "kobold";
      choose: string;
      files: Sent[];
      chosen: string | null;
    }
  // The idea being written: the kobold's job, until it made the idea.
  | { id: number; by: "kobold"; job: string; asked: Request }
  // A question being answered.
  | { id: number; by: "kobold"; thinking: true; asked: Request };

// A message before it has its place in the conversation.
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
export type Saying = WithoutId<Said>;

export function isQuestion(text: string): boolean {
  return /\?\s*$/.test(text.trim());
}

// What the kobold says to a message: an answer is on its way, or who is it
// for (chosen at once when there is only one).
export function replyTo(
  text: string,
  people: { id: string }[],
): { thinking: true } | { choose: string; chosen: string | null } {
  if (isQuestion(text)) return { thinking: true };
  const [only] = people;
  return { choose: text, chosen: people.length === 1 && only ? only.id : null };
}

type JobLike = { id: string; kind: string; about: string; working: boolean };

// What the kobold is working on in this conversation, if anything: the
// message that shows it, what was asked, and its job (null while a
// question's job is not seen yet).
export type Busy = { at: number; asked: Request; job: string | null };

export function busyOf(said: Said[], jobs: JobLike[]): Busy | null {
  const last = said.findLast((one) => one.by === "kobold");
  if (!last) return null;
  if ("thinking" in last && last.asked.kind === "question") {
    const { question } = last.asked;
    const job = jobs.find(
      (one) =>
        one.working && one.kind === "answer" && one.about === question.trim(),
    );
    return { at: last.id, asked: last.asked, job: job?.id ?? null };
  }
  if ("job" in last) {
    const working = jobs.some((one) => one.id === last.job && one.working);
    return working ? { at: last.id, asked: last.asked, job: last.job } : null;
  }
  return null;
}

// What was asked, with what the person added to steer it.
export function steered(asked: Request, guidance: string): Request {
  const more = `\n\nAlso: ${guidance.trim()}`;
  return asked.kind === "question"
    ? { ...asked, question: `${asked.question}${more}` }
    : { ...asked, text: `${asked.text}${more}` };
}

// The files as the server takes them with a message.
export function filesOf(files: Sent[]): { id: string; name: string }[] {
  return files.map(({ id, name }) => ({ id, name }));
}
