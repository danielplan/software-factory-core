// A prototype that is made but cannot run, because the project does not say
// how to start it. Variant B: a kobold sets the start up (the button in the
// red box); variant C: the same box, with plain steps and a message to send.
// Words are written straight in, English only (a prototype).

import { Check, Copy, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";

import { STATE, VARIANT } from "./prototype-variant";

// What the box says about itself, for either variant.
const TITLE = "This prototype is made, but it cannot run yet";

// The message the owner sends to whoever knows the code.
const MESSAGE = `Hi! Our software factory (Kobble) made a prototype but cannot run it: it does not know how to start our app.

Could you add this to factory/factory.json?

"prototype": { "start": "<the command that starts our app>" }

The command should start the app and, once it is ready, print one line: FACTORY_URL=http://localhost:<port>

Thank you!`;

function Message() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 grid gap-2">
      <pre className="max-h-40 overflow-auto rounded-lg bg-card px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground shadow-[inset_0_0_0_1px_var(--line-soft)]">
        {MESSAGE}
      </pre>
      <div>
        <Button
          size="pill-sm"
          variant="ring"
          onClick={() => {
            void navigator.clipboard.writeText(MESSAGE).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy the message"}
        </Button>
      </div>
    </div>
  );
}

// Variant C: nobody has to know what factory.json is.
function Steps() {
  return (
    <>
      <ProblemBox
        title={TITLE}
        text="Kobble does not know how to start your project yet. This is set once, by someone who knows the code, and takes them a few minutes."
      >
        <ol className="mt-2 grid list-decimal gap-1 pl-5 text-[13px] text-foreground/80">
          <li>Copy the message below.</li>
          <li>Send it to your developer, or to whoever looks after the code.</li>
          <li>When they say it is done, press Start again on the prototype.</li>
        </ol>
        <Message />
      </ProblemBox>
    </>
  );
}

type Stage = "ask" | "reading" | "writing" | "trying" | "keep" | "kept" | "problem";

const WORKING: Stage[] = ["reading", "writing", "trying"];
const DOING: Record<string, string> = {
  reading: "Reading the project",
  writing: "Writing how to start it",
  trying: "Trying it: starting it and waiting for the page",
};

function firstStage(): Stage {
  if (STATE === "working") return "reading";
  if (STATE === "keep" || STATE === "kept" || STATE === "problem") return STATE;
  return "ask";
}

// A made-up start, as the kobold would propose it (this prototype does not
// read the project).
const PROPOSED = "npm install && npm run dev -- --port $PORT";

// Variant B: the kobold does it. The steps run on timers here; a made-up
// result stands in for the real read of the project.
function Kobold() {
  const [stage, setStage] = useState<Stage>(firstStage);
  useEffect(() => {
    // A state picked by the address stays as it is.
    if (STATE || !WORKING.includes(stage)) return;
    const next = WORKING[WORKING.indexOf(stage) + 1] ?? "keep";
    const timer = setTimeout(() => {
      setStage(next);
    }, 1600);
    return () => {
      clearTimeout(timer);
    };
  }, [stage]);

  if (stage === "kept")
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl border border-success/30 bg-success/[0.08] px-4 py-3 text-[13px]"
      >
        <Check aria-hidden className="mt-0.5 size-4 flex-none text-success" />
        <div className="grid min-w-0 gap-0.5">
          <p className="font-medium">The start is kept</p>
          <p className="text-foreground/80">
            It is saved for every prototype of this project. Press Start on the
            prototype.
          </p>
        </div>
      </div>
    );

  if (stage === "problem")
    return (
      <ProblemBox
        title="The kobold could not find how to start this project"
        text="It read the project and tried two ways, but nothing came up. Someone who knows the code can tell it in a minute: send them this."
      >
        <Message />
        <div className="mt-2">
          <Button
            size="pill-sm"
            variant="ring"
            onClick={() => {
              setStage("reading");
            }}
          >
            Let the kobold try again
          </Button>
        </div>
      </ProblemBox>
    );

  return (
    <ProblemBox
      title={TITLE}
      text={
        stage === "keep"
          ? "The kobold wrote how to start the project and tried it: the page came up."
          : "Kobble does not know how to start your project yet. A kobold can work it out for you: nobody has to write anything."
      }
    >
      {stage === "ask" && (
        <div className="mt-2">
          <Button
            size="pill-sm"
            onClick={() => {
              setStage("reading");
            }}
          >
            Let a kobold set it up
          </Button>
        </div>
      )}
      {WORKING.includes(stage) && (
        <ul className="mt-2 grid gap-1 text-[13px] text-foreground/80">
          {WORKING.map((one) => {
            const done = WORKING.indexOf(one) < WORKING.indexOf(stage);
            return (
              <li key={one} className="flex items-center gap-2">
                {done ? (
                  <Check aria-hidden className="size-3.5 text-success" />
                ) : (
                  <LoaderCircle
                    aria-hidden
                    className={
                      one === stage
                        ? "size-3.5 motion-safe:animate-spin"
                        : "size-3.5 opacity-30"
                    }
                  />
                )}
                <span className={one === stage || done ? "" : "opacity-50"}>
                  {DOING[one]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {stage === "keep" && (
        <div className="mt-2 grid gap-2">
          <code className="rounded-lg bg-card px-3 py-2 text-xs break-all text-foreground shadow-[inset_0_0_0_1px_var(--line-soft)]">
            {PROPOSED}
          </code>
          <p className="text-xs text-muted-foreground">
            Made-up example. Kept, it is written into factory/factory.json for
            you.
          </p>
          <div className="flex gap-2">
            <Button
              size="pill-sm"
              onClick={() => {
                setStage("kept");
              }}
            >
              Keep it
            </Button>
            <Button
              size="pill-sm"
              variant="ring"
              onClick={() => {
                setStage("reading");
              }}
            >
              Try another way
            </Button>
          </div>
        </div>
      )}
    </ProblemBox>
  );
}

export function NoStart() {
  return VARIANT === "C" ? <Steps /> : <Kobold />;
}

// The start box replaces the plain "did not work" one when this is why.
export function isNoStart(words: string | null): boolean {
  return words !== null && words.includes("cannot run here yet");
}
