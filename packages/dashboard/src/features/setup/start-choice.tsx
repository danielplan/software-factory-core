// Before the first answer of setting up: is this a new product, or one the
// team already has? The folder is looked at and guessed from; what is asked,
// and when, differs per variant (prototype). Everything here is made up from
// the page address's ?state= (empty, code, docs, mixed, loading).

import {
  Boxes,
  Check,
  FileText,
  FolderSearch,
  LoaderCircle,
  MousePointerClick,
  PackageCheck,
  Send,
  Sparkles,
  Play,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { stateOfVisit, variantOfVisit } from "@/lib/prototype-switches";
import { cn } from "@/lib/utils";

type Path = "new" | "existing";

type Folder = {
  // What the kobold saw in the folder, in a line.
  line: string;
  // What it would guess, and whether it is sure of it.
  guess: Path;
  sure: boolean;
  // Why it guesses so, in a few words.
  why: string;
  // What it would bring over, made up.
  found: string[];
};

const PROJECT = "/Users/you/projects/bakery-shop-ordering-and-delivery-app";

const FOLDERS: Record<string, Folder> = {
  empty: {
    line: "The folder is empty.",
    guess: "new",
    sure: true,
    why: "Nothing is built here yet.",
    found: [],
  },
  code: {
    line: "I found two apps (a React web app and a NestJS API) with a git history.",
    guess: "existing",
    sure: true,
    why: "There is real code here, with history.",
    found: [
      "A web app, React",
      "An API, NestJS",
      "12 pages of old docs",
      "38 open tickets in a backlog export",
    ],
  },
  docs: {
    line: "I found 14 documents (notes, a product brief) and no code.",
    guess: "new",
    sure: false,
    why: "Only documents, so maybe the ideas come first.",
    found: ["14 documents", "A product brief"],
  },
  mixed: {
    line: "I found one small script and a docs folder with an old backlog.",
    guess: "existing",
    sure: false,
    why: "A little code and a lot of documents.",
    found: ["A script, Node", "9 pages of docs", "21 tickets in a backlog export"],
  },
};

export function StartChoice() {
  const variant = variantOfVisit();
  const state = stateOfVisit() ?? "empty";
  const folder = FOLDERS[state] ?? FOLDERS.empty;
  const [chosen, setChosen] = useState<Path | null>(null);
  if (state === "loading") return <Looking />;
  // Where each variant starts without asking.
  const auto =
    variant === "B" || (variant === "C" && folder.sure) ? folder.guess : null;
  const path = chosen ?? auto;
  if (!path)
    return (
      <Question
        folder={folder}
        unsure={variant === "C"}
        onChoose={setChosen}
      />
    );
  return (
    <PathScreen
      key={path}
      path={path}
      folder={folder}
      // Variant B only: the folder decided, a small link says otherwise.
      switchTo={
        variant === "B"
          ? () => {
              setChosen(path === "new" ? "existing" : "new");
            }
          : undefined
      }
    />
  );
}

function Looking() {
  return (
    <div className="grid justify-items-center gap-4 pt-16 text-center">
      <KoboldHead size={88} />
      <h1 className="text-2xl font-semibold tracking-[-0.015em]">
        Hi, I’m your kobold.
      </h1>
      <p className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Taking a look at your folder…
      </p>
    </div>
  );
}

// What the kobold saw in the folder, with the folder's path wrapping
// anywhere inside its box.
function Seen({ folder }: Readonly<{ folder: Folder }>) {
  return (
    <div className="grid w-full max-w-[640px] gap-1 rounded-xl bg-card px-4 py-3 text-left shadow-card">
      <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <FolderSearch className="size-4 flex-none" aria-hidden />
        <span className="min-w-0 break-all">{PROJECT}</span>
      </span>
      <span className="text-[14.5px] [overflow-wrap:anywhere]">
        {folder.line}
      </span>
    </div>
  );
}

const OPTIONS: {
  path: Path;
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    path: "new",
    icon: Sparkles,
    title: "Something new",
    text: "Nothing built yet. I interview you, make your apps from the kits’ starters and build a first prototype.",
  },
  {
    path: "existing",
    icon: Boxes,
    title: "Something we have",
    text: "There is code already. I recognise your apps, check them, and bring over your old docs and backlog.",
  },
];

// Two big cards, the folder's guess marked: one click either way.
function Question({
  folder,
  unsure,
  onChoose,
}: Readonly<{
  folder: Folder;
  unsure: boolean;
  onChoose: (path: Path) => void;
}>) {
  return (
    <div className="grid justify-items-center gap-5 pt-12 text-center">
      <KoboldHead size={88} />
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">
          {unsure
            ? "I can’t tell what this folder is."
            : "Is this new, or do you already have it?"}
        </h1>
        <p className="max-w-[56ch] text-muted-foreground">
          {unsure
            ? "Which one is it? I’ll set Kobble up the way that fits."
            : "I set Kobble up differently for each. One click, and you can still change it later."}
        </p>
      </div>
      <Seen folder={folder} />
      <div
        role="radiogroup"
        aria-label="New or existing"
        className="grid w-full max-w-[640px] grid-cols-2 gap-3 text-left max-sm:grid-cols-1"
      >
        {OPTIONS.map((option) => {
          const guessed = !unsure && option.path === folder.guess;
          return (
            <button
              key={option.path}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => {
                onChoose(option.path);
              }}
              className={cn(
                "relative flex min-w-0 flex-col gap-3 rounded-[14px] border bg-card p-6 text-left text-card-foreground shadow-[0_1px_2px_rgb(27_31_42/0.04)] transition outline-none hover:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/40",
                guessed
                  ? "border-[1.5px] border-foreground"
                  : "border-border-soft",
              )}
            >
              {guessed && (
                <span className="absolute top-4 right-4 rounded-full bg-wash px-2 py-0.5 text-[11.5px] font-semibold text-wash-foreground">
                  Suggested
                </span>
              )}
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg [&_svg]:size-5",
                  guessed
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <option.icon aria-hidden />
              </span>
              <span className="grid gap-1">
                <b className="text-[15px] font-semibold">{option.title}</b>
                <span className="text-[13.5px] text-muted-foreground [overflow-wrap:anywhere]">
                  {option.text}
                </span>
                {guessed && (
                  <span className="pt-1 text-[12.5px] text-faint">
                    {folder.why}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// What happens on the chosen path: the interview for something new, the
// reading for something that exists.
function PathScreen({
  path,
  folder,
  switchTo,
}: Readonly<{ path: Path; folder: Folder; switchTo?: () => void }>) {
  const isNew = path === "new";
  return (
    <div className="grid justify-items-center gap-5 pt-12 text-center">
      <KoboldHead size={88} />
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">
          {isNew ? "Let’s make something new." : "Let’s bring in what you have."}
        </h1>
        {switchTo && (
          <p className="max-w-[56ch] text-[13.5px] text-muted-foreground">
            {isNew
              ? "This folder looks new to me. "
              : "This folder looks like an existing product to me. "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-2"
              onClick={switchTo}
            >
              {isNew ? "Actually, we have code" : "Actually, this is new"}
            </button>
          </p>
        )}
      </div>
      <Seen folder={folder} />
      {isNew ? <Interview /> : <Reading folder={folder} />}
    </div>
  );
}

function Plan({
  items,
}: Readonly<{ items: { icon: LucideIcon; text: string }[] }>) {
  return (
    <ol className="grid w-full max-w-[640px] rounded-xl bg-card text-left shadow-card">
      {items.map((item, n) => (
        <li
          key={item.text}
          className="flex items-center gap-3 border-t border-border-soft px-5 py-3.5 first:border-t-0"
        >
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
            <item.icon aria-hidden />
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <span className="text-[12.5px] text-muted-foreground">
              {n + 1}.{" "}
            </span>
            {item.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Something new: what comes, and the kobold's first interview question.
function Interview() {
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  return (
    <>
      <Plan
        items={[
          { icon: MousePointerClick, text: "A short interview: who it’s for and what it does" },
          { icon: PackageCheck, text: "Your apps, made from the kits’ starters" },
          { icon: Play, text: "A first prototype you can click" },
        ]}
      />
      <div className="flex w-full max-w-[640px] items-start gap-3 text-left">
        <KoboldHead size={40} />
        <div className="grid min-w-0 flex-1 gap-3 rounded-[4px_16px_16px_16px] bg-card px-4 py-3 text-[14.5px] leading-relaxed shadow-card">
          <p>
            <b className="font-semibold">First question.</b> Who is it for, and
            what is the one thing they should be able to do?
          </p>
          {sent === null ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSent(answer.trim());
              }}
            >
              <input
                aria-label="Your answer"
                className="h-9 min-w-0 flex-1 rounded-xl bg-ground px-3 text-[13.5px] outline-none"
                placeholder="Your answer"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                }}
              />
              <Button type="submit" size="pill-sm" disabled={!answer.trim()}>
                <Send aria-hidden />
                Answer
              </Button>
            </form>
          ) : (
            <p className="flex items-start gap-2 text-muted-foreground">
              <LoaderCircle
                className="mt-0.5 size-4 flex-none animate-spin"
                aria-hidden
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">
                Thanks, “{sent}”. One moment, I’m thinking about my next
                question…
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// Something that exists: what is recognised, then what is brought over.
function Reading({ folder }: Readonly<{ folder: Folder }>) {
  const [started, setStarted] = useState(false);
  const found: ReactNode[] = folder.found.length
    ? folder.found
    : ["The folder is empty, so there is nothing to read yet."];
  return (
    <>
      <Plan
        items={[
          { icon: Boxes, text: "I recognise your apps" },
          { icon: PackageCheck, text: "I check that they start and what they need" },
          { icon: FileText, text: "I bring over your old docs and backlog" },
        ]}
      />
      {started ? (
        <ul className="grid w-full max-w-[640px] rounded-xl bg-card text-left shadow-card">
          {found.map((what, n) => (
            <li
              key={String(what)}
              className="flex items-center gap-3 border-t border-border-soft px-5 py-3 first:border-t-0"
            >
              {folder.found.length === 0 ? (
                <FolderSearch
                  className="size-[18px] flex-none text-muted-foreground"
                  aria-hidden
                />
              ) : n < found.length - 1 ? (
                <Check
                  className="size-[18px] flex-none rounded-full bg-[#12a594] p-0.5 text-white"
                  aria-hidden
                />
              ) : (
                <LoaderCircle
                  className="size-[18px] flex-none animate-spin text-muted-foreground"
                  aria-hidden
                />
              )}
              <span className="min-w-0 [overflow-wrap:anywhere]">{what}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Button
          size="pill"
          onClick={() => {
            setStarted(true);
          }}
        >
          <Play aria-hidden />
          Start reading
        </Button>
      )}
    </>
  );
}
