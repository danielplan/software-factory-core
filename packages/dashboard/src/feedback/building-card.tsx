// The post building itself while the person talks: a title, what happened,
// and what goes along (version, page, errors with any team data marked so
// it can be taken out). When the draft is ready the title can be changed,
// each part removed, and the post sent with the person's GitHub sign-in.

import { Bug, CircleUserRound, Lightbulb, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import { useSignedIn, withSignIn } from "./feedback-board";
import { SignInHelp } from "./sign-in-help";
import {
  type Draft,
  editDraft,
  liveDraft,
  type Part,
  sendDraft,
  teamBits,
  type Thread,
} from "./tell-kobold";

function Placeholder({ className }: Readonly<{ className: string }>) {
  return (
    <span
      className={cn(
        "block rounded-full bg-line-soft/70 motion-safe:animate-breathe",
        className,
      )}
    />
  );
}

function Heading({
  thread,
  ready,
}: Readonly<{ thread: Thread; ready: boolean }>) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground [&_svg]:size-3">
      {thread.kind === "bug" ? <Bug aria-hidden /> : <Lightbulb aria-hidden />}
      {thread.kind === "bug" ? "Bug" : "Wish"} · new post
      <span className="ml-auto flex items-center gap-1.5">
        {!ready && (
          <span className="size-1.5 rounded-full bg-[#8b8ff0] motion-safe:animate-breathe" />
        )}
        {ready ? "Ready to send" : "Writing itself…"}
      </span>
    </span>
  );
}

function Title({
  draft,
  ready,
}: Readonly<{ draft: Draft | null; ready: boolean }>) {
  if (!draft) return <Placeholder className="h-4 w-2/3" />;
  if (ready)
    return (
      <input
        aria-label="Title"
        value={draft.title}
        onChange={(event) => {
          editDraft({ title: event.target.value });
        }}
        className="-mx-1 rounded-md bg-transparent px-1 text-[14px] font-semibold outline-none hover:bg-card focus:bg-card"
      />
    );
  return (
    <b
      key={draft.title}
      className="text-[14px] font-semibold motion-safe:animate-rise"
    >
      {draft.title}
    </b>
  );
}

function Sentences({ draft }: Readonly<{ draft: Draft | null }>) {
  const sentences = draft?.body.split(/\n\n+/).filter(Boolean) ?? [];
  if (sentences.length === 0)
    return (
      <div className="grid gap-1.5">
        <Placeholder className="h-3 w-full" />
        <Placeholder className="h-3 w-4/5" />
      </div>
    );
  return (
    <div className="grid gap-1 text-[12.5px] leading-snug text-foreground-2">
      {sentences.map((one, at) => (
        <p key={`${String(at)}-${one}`} className="motion-safe:animate-rise">
          {one}
        </p>
      ))}
    </div>
  );
}

// What goes along, with the team's data marked: a click takes it out.
function PartText({
  part,
  onChange,
}: Readonly<{ part: Part; onChange: (edit: Partial<Part>) => void }>) {
  const t = useT().feedback;
  return (
    <span className="min-w-0 break-words">
      {part.label === "error" ? "error: " : ""}
      {teamBits(part.text).map((bit, at) =>
        bit.team && !part.removed ? (
          <button
            key={at}
            type="button"
            title={`${t.remove}: the board is public`}
            onClick={() => {
              onChange({ text: part.text.replace(bit.text, t.chat.taken) });
            }}
            className="rounded-sm bg-warning/25 px-0.5 text-foreground hover:bg-destructive/15 hover:line-through"
          >
            {bit.text}
          </button>
        ) : (
          <span key={at}>{bit.text}</span>
        ),
      )}
    </span>
  );
}

function PartChip({
  part,
  ready,
  onChange,
}: Readonly<{
  part: Part;
  ready: boolean;
  onChange: (edit: Partial<Part>) => void;
}>) {
  const t = useT().feedback;
  return (
    <span
      className={cn(
        "group inline-flex max-w-full items-start gap-1 rounded-md border border-line-soft bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground motion-safe:animate-rise",
        part.label === "error" && "basis-full font-mono text-[10.5px]",
        part.removed && "line-through opacity-50",
      )}
    >
      <PartText part={part} onChange={onChange} />
      {ready && (
        <button
          type="button"
          aria-label={part.removed ? t.putBack : t.remove}
          onClick={() => {
            onChange({ removed: !part.removed });
          }}
          className="mt-px flex-none opacity-40 hover:opacity-100 group-hover:opacity-70 [&_svg]:size-3"
        >
          {part.removed ? <RotateCcw aria-hidden /> : <X aria-hidden />}
        </button>
      )}
    </span>
  );
}

function SendBar({
  draft,
  sending,
}: Readonly<{ draft: Draft; sending: boolean }>) {
  const signedIn = useSignedIn();
  return (
    <div className="flex items-center gap-2 border-t border-line-soft pt-2.5 text-[11.5px] text-muted-foreground motion-safe:animate-rise [&_svg]:size-3.5">
      <CircleUserRound aria-hidden />
      <span className="flex-1">
        {signedIn ? `as @${signedIn}` : "with your GitHub sign-in"}
      </span>
      <Button
        size="sm"
        disabled={!draft.title.trim()}
        busy={sending}
        onClick={() => {
          withSignIn(sendDraft);
        }}
      >
        Send
      </Button>
    </div>
  );
}

export function BuildingCard({ thread }: Readonly<{ thread: Thread }>) {
  const draft = liveDraft(thread);
  const ready = thread.step === "draft";
  const changePart = (part: Part, edit: Partial<Part>) => {
    if (!draft) return;
    editDraft({
      parts: draft.parts.map((one) =>
        one.id === part.id ? { ...one, ...edit } : one,
      ),
    });
  };
  return (
    <div className="mx-4 mt-1 grid max-h-[min(18rem,37vh)] flex-none gap-2.5 overflow-auto rounded-xl border border-line-soft bg-surface/50 p-3.5 motion-safe:animate-rise">
      <Heading thread={thread} ready={ready} />
      <Title draft={draft} ready={ready} />
      <Sentences draft={draft} />
      <div className="flex flex-wrap gap-1.5">
        {(draft?.parts ?? []).map((part) => (
          <PartChip
            key={part.id}
            part={part}
            ready={ready}
            onChange={(edit) => {
              changePart(part, edit);
            }}
          />
        ))}
      </div>
      {ready && draft && <SendBar draft={draft} sending={thread.sending} />}
      <SignInHelp problem={thread.problem} />
    </div>
  );
}
