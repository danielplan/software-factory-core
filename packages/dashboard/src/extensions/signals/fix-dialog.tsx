// Fix, as a popup: Bolt, the builder, takes a quick read-only look at the
// code and says what it would do (what happens, the likely cause, what it
// would change, how we will know); Looks right makes the card with that
// plan, Change asks Bolt to change the plan, Cancel makes nothing. The card
// is made once: the button stays busy until GitHub answers.

import { Wrench } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { messageOf, post, type SignalRow } from "@/api/client";
import { type FixPlan, fixPlanAnswerSchema } from "@/api/schemas/signals";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { KOBOLDS } from "@/lib/kobolds";
import { doneWords } from "@/lib/signals-view";

const bolt = KOBOLDS.find((kobold) => kobold.id === "builder");

const SECTION =
  "text-[12px] font-semibold tracking-wide text-muted-foreground uppercase";

// Asks Bolt for a plan (again, with a correction).
const askPlan = (id: string, before?: FixPlan, correction?: string) =>
  post<unknown>("/api/kobble/signals/fix-plan", {
    id,
    before,
    correction,
  }).then((answer) => fixPlanAnswerSchema.parse(answer).plan);

// Bolt's plan for the signal: asked for once the popup opens, and again
// with a correction.
function useFixPlan(id: string) {
  const [plan, setPlan] = useState<FixPlan | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [looking, setLooking] = useState(true);
  const settle = (asked: Promise<FixPlan>) =>
    asked.then(
      (next) => {
        setPlan(next);
        setLooking(false);
      },
      (error: unknown) => {
        setProblem(messageOf(error));
        setLooking(false);
      },
    );
  // Asked once, when the popup opens (for its signal).
  useEffect(() => {
    void askPlan(id).then(
      (next) => {
        setPlan(next);
        setLooking(false);
      },
      (error: unknown) => {
        setProblem(messageOf(error));
        setLooking(false);
      },
    );
  }, [id]);
  const again = (correction?: string) => {
    setLooking(true);
    setProblem(null);
    return settle(askPlan(id, plan ?? undefined, correction));
  };
  return { plan, problem, looking, again };
}

export function FixDialog({
  signal,
  onClose,
  onDone,
  onFailed,
}: Readonly<{
  signal: SignalRow;
  // Told false when the popup closes without a card.
  onClose: (open: false) => void;
  onDone: (said: string) => void;
  onFailed: (said: string) => void;
}>) {
  const t = useTranslation().t;
  const fix = useFixPlan(signal.id);
  const [making, setMaking] = useState(false);
  const make = () => {
    setMaking(true);
    post("/api/kobble/signals/fix", { id: signal.id, plan: fix.plan }).then(
      (answer) => {
        onDone(doneWords("fix", signal, answer, t));
      },
      (error: unknown) => {
        setMaking(false);
        onFailed(messageOf(error));
      },
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(now) => {
        if (!now && !making) onClose(false);
      }}
    >
      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto rounded-[20px] sm:max-w-[560px]">
        <DialogTitle className="flex items-center gap-2 text-[17px]">
          <Wrench aria-hidden className="size-[18px]" />
          {t("signals.fixPlan.title")}
        </DialogTitle>
        <DialogDescription className="text-[13.5px] text-foreground-2">
          {signal.text}
        </DialogDescription>
        <Looking fix={fix} />
        <Choices fix={fix} making={making} onMake={make} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

type Fix = ReturnType<typeof useFixPlan>;

// Bolt at work, why it could not, or its plan.
function Looking({ fix }: Readonly<{ fix: Fix }>) {
  const t = useTranslation().t;
  if (fix.looking)
    return (
      <p
        aria-live="polite"
        className="grid gap-1 rounded-xl bg-surface px-4 py-3"
      >
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <KoboldHead size={22} hat={bolt?.hat} color={bolt?.color} />
          {t("signals.fixPlan.looking")}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {t("signals.fixPlan.lookingLine")}
        </span>
      </p>
    );
  if (fix.problem)
    return (
      <p role="alert" className="text-[13px] text-destructive">
        {fix.problem}{" "}
        <button
          type="button"
          onClick={() => {
            void fix.again();
          }}
          className="font-semibold text-blue"
        >
          {t("signals.fixPlan.tryAgain")}
        </button>
      </p>
    );
  return fix.plan && <PlanView plan={fix.plan} />;
}

// Looks right, Change (and the correction), Cancel.
function Choices({
  fix,
  making,
  onMake,
  onClose,
}: Readonly<{
  fix: Fix;
  making: boolean;
  onMake: () => void;
  onClose: (open: false) => void;
}>) {
  const t = useTranslation().t;
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState("");
  const ready = fix.plan !== null && !fix.looking;
  const redo = () => {
    void fix.again(correction.trim()).then(() => {
      setCorrecting(false);
      setCorrection("");
    });
  };
  return (
    <>
      {ready && correcting && (
        <Correction value={correction} onChange={setCorrection} />
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        {correcting ? (
          <Button
            size="pill"
            disabled={!correction.trim() || fix.looking}
            onClick={redo}
          >
            {t("signals.fixPlan.redo")}
          </Button>
        ) : (
          <Button
            size="pill"
            busy={making}
            disabled={!ready || making}
            onClick={onMake}
          >
            {making ? t("signals.fixPlan.making") : t("signals.fixPlan.make")}
          </Button>
        )}
        {ready && !correcting && (
          <Button
            variant="ring"
            size="pill"
            disabled={making}
            onClick={() => {
              setCorrecting(true);
            }}
          >
            {t("signals.fixPlan.correct")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="pill"
          className="ml-auto"
          disabled={making}
          onClick={() => {
            onClose(false);
          }}
        >
          {t("signals.fixPlan.cancel")}
        </Button>
      </div>
    </>
  );
}

function PlanView({ plan }: Readonly<{ plan: FixPlan }>) {
  const t = useTranslation().t;
  const part = (title: string, body: ReactNode) => (
    <section className="grid gap-1">
      <h3 className={SECTION}>{title}</h3>
      {body}
    </section>
  );
  return (
    <div className="grid gap-3 rounded-xl border border-line-soft px-4 py-3.5 text-[14px] leading-snug">
      <p className="font-semibold">
        {t("signals.fixPlan.cardTitle", { title: plan.title })}
      </p>
      {part(
        t("signals.fixPlan.happens"),
        <p className="text-foreground-2">{plan.happens}</p>,
      )}
      {part(
        t("signals.fixPlan.cause"),
        <p className="text-foreground-2">{plan.cause}</p>,
      )}
      {part(
        t("signals.fixPlan.change"),
        <ul className="grid list-disc gap-0.5 pl-5 text-foreground-2">
          {plan.change.map((one) => (
            <li key={one}>{one}</li>
          ))}
        </ul>,
      )}
      {part(
        t("signals.fixPlan.check"),
        <p className="text-foreground-2">{plan.check}</p>,
      )}
    </div>
  );
}

// What the team wants changed in the plan.
function Correction({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  const t = useTranslation().t;
  return (
    <textarea
      aria-label={t("signals.fixPlan.correctLabel")}
      placeholder={t("signals.fixPlan.correctLabel")}
      value={value}
      rows={3}
      autoFocus
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className="w-full resize-y rounded-[10px] border border-input bg-card px-3 py-2 text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
  );
}
