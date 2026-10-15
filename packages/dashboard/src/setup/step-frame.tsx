import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const STEPS = ["Company", "Products", "Work tracking", "Review"];

// One step of the setup flow: where it is in the steps, its title and
// explanation, its content, and Back and Next.
export function StepFrame({
  step,
  title,
  about,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  canGoOn = true,
}: Readonly<{
  step: number;
  title: string;
  about: ReactNode;
  children: ReactNode;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  canGoOn?: boolean;
}>) {
  return (
    <section className="grid gap-6" aria-labelledby="step-title">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Setup steps">
        {STEPS.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              index === step &&
                "border-primary bg-secondary text-secondary-foreground",
              index < step && "text-muted-foreground",
              index > step && "text-muted-foreground/70",
            )}
          >
            <span className="font-semibold">{index + 1}</span> {name}
          </li>
        ))}
      </ol>
      <header className="grid gap-1">
        <h1 id="step-title" className="text-2xl font-semibold">
          {title}
        </h1>
        <div className="max-w-2xl text-muted-foreground">{about}</div>
      </header>
      {children}
      <footer className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {onNext && (
          <Button onClick={onNext} disabled={!canGoOn}>
            {nextLabel} <ArrowRight aria-hidden />
          </Button>
        )}
      </footer>
    </section>
  );
}
