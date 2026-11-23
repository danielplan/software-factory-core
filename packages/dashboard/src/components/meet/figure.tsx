// A kobold on its own spot: at work it moves with what it holds (each in its
// own way); resting it sleeps, eyes closed, breathing. Nothing moves when
// the computer asks for calm.

import { type ReactNode, useEffect, useState } from "react";

import { KoboldHead } from "@/components/kobold-face";
import type { Member, TeamId } from "@/lib/kobolds";
import { cn } from "@/lib/utils";

const INK = "#1b2236";

function calm(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Mimic swaps hats while it works (nothing moves for who prefers calm); the
// new hat fades in, so the face never flickers.
const HATS = ["cap", "toque", "beret", "phones"] as const;
function useHat(own: Member["hat"], working: boolean): Member["hat"] {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!working || calm()) return;
    const timer = setInterval(() => {
      setAt((was) => was + 1);
    }, 1600);
    return () => {
      clearInterval(timer);
    };
  }, [working]);
  return working && !calm() ? (HATS[at % HATS.length] ?? own) : own;
}

// What each kobold holds while it works, drawn beside it in the face's
// 44-unit box.
function ExplorerProp({ color }: Readonly<{ color: string }>) {
  return (
    <>
      <rect
        x={28}
        y={25}
        width={15}
        height={15}
        rx={2.5}
        fill="#fff"
        stroke={INK}
        strokeOpacity={0.2}
      />
      <path
        className="meet-draw"
        d="M30.5 35 q2.2 -6 4.4 0 t4.4 0"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <g className="meet-sketch" style={{ transformOrigin: "40px 31px" }}>
        <path
          d="M37 35 L44 28"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <path d="M37 35 l-1.8 1.8" stroke={INK} strokeWidth={1.4} />
      </g>
    </>
  );
}

function MakerProp() {
  return (
    <>
      <rect x={30} y={38} width={13} height={4} rx={1} fill="#c9a77d" />
      <circle className="meet-spark" cx={32} cy={36} r={1.4} fill="#ffc94d" />
      <g className="meet-hammer" style={{ transformOrigin: "42px 38px" }}>
        <path
          d="M42 38 L37 27"
          stroke="#8a6a4a"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <rect
          x={32}
          y={24}
          width={9}
          height={4.2}
          rx={1}
          fill="#667085"
          transform="rotate(-20 36 26)"
        />
      </g>
    </>
  );
}

function BuilderProp({ color }: Readonly<{ color: string }>) {
  return (
    <>
      {[0, 1, 2].map((at) => (
        <rect
          key={at}
          className="meet-block"
          x={31 + (at === 1 ? 1.5 : 0)}
          y={37 - at * 5.5}
          width={11}
          height={5}
          rx={1.2}
          fill={color}
          fillOpacity={0.55 + at * 0.2}
          style={{ animationDelay: `${String(at * 0.55)}s` }}
        />
      ))}
    </>
  );
}

function SorterProp({ color }: Readonly<{ color: string }>) {
  return (
    <>
      <circle className="meet-fall" cx={35} cy={38} r={0.9} fill={color} />
      <circle
        className="meet-fall"
        cx={40}
        cy={38}
        r={0.9}
        fill={color}
        style={{ animationDelay: "0.4s" }}
      />
      <g className="meet-shake" style={{ transformOrigin: "37px 30px" }}>
        <path
          d="M29 29.5 Q37 41 45 29.5 Z"
          fill="#fff"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path
          d="M32 33 H42 M34.5 36 H39.5"
          stroke={color}
          strokeWidth={0.8}
          strokeDasharray="1.2 1.4"
        />
      </g>
    </>
  );
}

function SupportProp({ color }: Readonly<{ color: string }>) {
  return (
    <g>
      {[0, 1, 2].map((at) => (
        <circle
          key={at}
          className="meet-dot"
          cx={32 + at * 5}
          cy={31}
          r={1.6}
          fill={color}
          style={{ animationDelay: `${String(at * 0.2)}s` }}
        />
      ))}
    </g>
  );
}

const PROPS: Partial<Record<TeamId, (color: string) => ReactNode>> = {
  explorer: (color) => <ExplorerProp color={color} />,
  maker: () => <MakerProp />,
  builder: (color) => <BuilderProp color={color} />,
  sorter: (color) => <SorterProp color={color} />,
  support: (color) => <SupportProp color={color} />,
};

// As big as the scene needs.
export function Figure({
  member,
  working,
  size,
}: Readonly<{ member: Member; working: boolean; size: number }>) {
  const hat = useHat(member.hat, working && member.id === "tester");
  return (
    <span
      className="relative flex-none"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={cn("block", !working && "meet-doze origin-bottom")}>
        <KoboldHead
          size={size}
          hat={hat}
          color={member.color}
          asleep={!working}
          fadeHat={member.id === "tester"}
          className={cn(
            working && member.id !== "tester" && "motion-safe:animate-bob",
          )}
        />
      </span>
      {working && (
        <svg
          viewBox="0 0 44 44"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          {PROPS[member.id]?.(member.color)}
        </svg>
      )}
    </span>
  );
}
