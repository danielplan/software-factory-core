// Signals before launch (the live app not connected): no customers yet, so
// the first signals come from the personas, sent on missions from Personas.
// While nothing came in yet: the personas' face tiles beside a plain app
// screen, one sentence and one button to Personas. The personas on a
// mission now, each with the step it is on. Connecting the live app is a
// line for after launch, which opens how to connect it.

import { Send } from "lucide-react";
import { useState } from "react";

import type { Face, MissionNow, PersonaRow } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { type Read, useRead } from "@/lib/use-read";
import { cn } from "@/lib/utils";

import { CARD } from "./bits";
import { ConnectSignals } from "./empty";
import { missionWords } from "./view";

// Before launch: the personas on a mission now, or (with no signal yet)
// the empty page; then the line about connecting the live app, which opens
// how to connect it.
export function BeforeLaunch({
  app,
  missions,
  empty,
}: Readonly<{ app: string; missions: MissionNow[]; empty: boolean }>) {
  const [connecting, setConnecting] = useState(false);
  if (connecting) return <ConnectSignals app={app} />;
  return (
    <div className="grid gap-4">
      {missions.length > 0 && <OnMissions missions={missions} />}
      {missions.length === 0 && empty && <NoCustomersYet />}
      <ConnectLater
        app={app}
        more={!empty}
        onConnect={() => {
          setConnecting(true);
        }}
      />
    </div>
  );
}

// "After launch, connect <app>", after "Send more personas" once there are
// signals.
function ConnectLater({
  app,
  more,
  onConnect,
}: Readonly<{ app: string; more: boolean; onConnect: () => void }>) {
  return (
    <p className="mx-1 text-[12.5px] text-muted-foreground">
      {more && (
        <>
          <a href={personaHash()} className="font-semibold text-blue">
            Send more personas
          </a>{" "}
          to find what to improve.{" "}
        </>
      )}
      After launch,{" "}
      <button
        type="button"
        onClick={onConnect}
        className="font-semibold text-blue"
      >
        connect {app}
      </button>{" "}
      to hear from customers.
    </p>
  );
}

function OnMissions({ missions }: Readonly<{ missions: MissionNow[] }>) {
  return (
    <section aria-label="On a mission" className={CARD}>
      {missions.map((mission) => (
        <a
          key={mission.id}
          href={personaHash(mission.persona)}
          className="flex items-center gap-3 border-t border-border-soft px-5 py-3 text-[13px] text-foreground-2 first:border-t-0 hover:bg-surface"
        >
          <PersonaFace face={mission.face} size={26} />
          <span className="font-semibold">{mission.name}</span>
          <span aria-live="polite" className="truncate text-muted-foreground">
            On a mission · {missionWords(mission)}
          </span>
        </a>
      ))}
    </section>
  );
}

// The faces in the picture before there is any persona.
const STAND_INS: Face[] = [
  { hat: "cap", color: "blue" },
  { hat: "toque", color: "amber" },
  { hat: "beret", color: "teal" },
];

function NoCustomersYet() {
  const { data } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  const faces = data?.personas.length
    ? data.personas.slice(0, 4).map((persona) => persona.face)
    : STAND_INS;
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-center gap-3 px-6 pt-10 pb-12 text-center",
      )}
    >
      <FacesAndScreen faces={faces} />
      <p className="mt-2 max-w-[400px] text-[15.5px] text-foreground-2">
        No customers yet. Send your personas to try the app, and what they find
        shows up here.
      </p>
      <Button asChild size="pill" className="mt-1.5">
        <a href={personaHash()}>
          <Send aria-hidden strokeWidth={2} className="size-[15px]" />
          Send a persona
        </a>
      </Button>
    </div>
  );
}

// The personas' face tiles in a row beside the plain outline of an app
// screen, with a few soft marks where they would find things: a bug, an
// idea and an open question, in the colours Signals gives them.
function FacesAndScreen({ faces }: Readonly<{ faces: Face[] }>) {
  const lines = [
    [30, 60],
    [46, 88],
    [62, 44],
    [76, 70],
  ];
  const marks = [
    [84, 33, "var(--type-feedback)", 0.28],
    [112, 49, "var(--type-bug)", 0.24],
    [68, 65, "var(--type-request)", 0.22],
  ] as const;
  return (
    <div aria-hidden className="flex items-center gap-6">
      <div className="flex -space-x-1.5">
        {faces.map((face, index) => (
          <PersonaFace
            key={`${face.hat}-${face.color}-${String(index)}`}
            face={face}
            size={44}
            className="rounded-[12px] ring-2 ring-card"
          />
        ))}
      </div>
      <svg width={132} height={96} viewBox="0 0 132 96" className="flex-none">
        <rect
          x={1}
          y={1}
          width={130}
          height={94}
          rx={10}
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth={1.5}
        />
        <path d="M1 18 L131 18" stroke="var(--border)" strokeWidth={1.5} />
        {[11, 18, 25].map((x) => (
          <circle key={x} cx={x} cy={9.5} r={2} fill="var(--surface-2)" />
        ))}
        {lines.map(([y = 0, width = 0]) => (
          <rect
            key={y}
            x={12}
            y={y}
            width={width}
            height={6}
            rx={3}
            fill="var(--surface-2)"
          />
        ))}
        {marks.map(([x, y, color, opacity]) => (
          <circle key={x} cx={x} cy={y} r={5} fill={color} opacity={opacity} />
        ))}
      </svg>
    </div>
  );
}
