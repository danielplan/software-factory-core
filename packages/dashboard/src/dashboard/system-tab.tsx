import { Play, Square } from "lucide-react";
import { useState } from "react";

import { messageOf, type PartView, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import type { FactoryState } from "./dashboard";
import { PartCard } from "./part-card";

const AREAS: { area: PartView["area"]; title: string }[] = [
  { area: "products", title: "Your products" },
  { area: "factory", title: "The factory" },
];

// Every part with its light and buttons, the products first.
export function SystemTab({ state }: Readonly<{ state: FactoryState }>) {
  const [problem, setProblem] = useState<string | null>(null);
  const press = (path: string) => {
    setProblem(null);
    post(path).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            press("/api/start-all");
          }}
        >
          <Play aria-hidden /> Start all
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            press("/api/stop-all");
          }}
        >
          <Square aria-hidden /> Stop all
        </Button>
      </div>
      {problem && <ProblemBox title="That did not work" text={problem} />}
      {AREAS.map(({ area, title }) => {
        const parts = state.parts.filter((part) => part.area === area);
        if (parts.length === 0) return null;
        return (
          <section key={area} className="grid gap-3" aria-label={title}>
            <h2 className="text-sm font-semibold text-muted-foreground">
              {title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {parts.map((part) => (
                <PartCard key={part.id} part={part} onPress={press} />
              ))}
            </div>
          </section>
        );
      })}
      {state.parts.length === 0 && (
        <p className="text-muted-foreground">
          Nothing to start yet: a product shows here once a kit knows how to run
          it.
        </p>
      )}
    </div>
  );
}
