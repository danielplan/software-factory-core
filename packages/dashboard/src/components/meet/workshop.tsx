// PROTOTYPE, "Meet the kobolds": the "Your kobolds" panel as a little
// workshop of who they are. Sprocket on top, a bit bigger, looks after the
// team; below it Sieve, Doodle, Tinker (Doodle's helper), Bolt and Mimic side
// by side. A kobold at work moves a little and says what it does now; a
// resting one sleeps, eyes closed, breathing gently. A click opens its card.

import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";

import { KoboldHead } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { closeTeam, type Member, memberOf } from "./meet";

const STATIONS = ["sorter", "explorer", "maker", "builder", "tester"];
const INK = "#1b2236";

function calm(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Mimic swaps hats while it works (nothing moves for who prefers calm).
const HATS = ["cap", "toque", "beret", "phones"] as const;
function useHat(own: Member["hat"], working: boolean): Member["hat"] {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!working || calm()) return;
    const timer = setInterval(() => {
      setAt((was) => was + 1);
    }, 1100);
    return () => {
      clearInterval(timer);
    };
  }, [working]);
  return working && !calm() ? HATS[at % HATS.length] : own;
}

// What each kobold holds while it works, drawn beside it in the face's
// 44-unit box; each moves in its own way.
function Prop({ id, color }: Readonly<{ id: string; color: string }>) {
  switch (id) {
    case "explorer":
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
    case "maker":
      return (
        <>
          <rect x={30} y={38} width={13} height={4} rx={1} fill="#c9a77d" />
          <circle
            className="meet-spark"
            cx={32}
            cy={36}
            r={1.4}
            fill="#ffc94d"
          />
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
    case "builder":
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
    case "sorter":
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
    case "support":
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
    default:
      return null;
  }
}

// A kobold on its own spot, as big as the scene needs: at work it moves
// with its prop; resting it sleeps, eyes closed, breathing.
function Figure({
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
      <span
        key={hat}
        className={cn(
          "block",
          !working && "meet-doze origin-bottom",
          hat !== member.hat && "motion-safe:animate-pop",
        )}
      >
        <KoboldHead
          size={size}
          hat={hat}
          color={member.color}
          asleep={!working}
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
          <Prop id={member.id} color={member.color} />
        </svg>
      )}
    </span>
  );
}

// What the kobold does now, as plain words in its own colour (no box).
function Now({
  member,
  now,
  className,
}: Readonly<{ member: Member; now: string; className?: string }>) {
  return (
    <span
      className={cn(
        "line-clamp-4 text-[12px] leading-snug font-medium break-words [overflow-wrap:anywhere]",
        className,
      )}
      style={{ color: member.color }}
      title={now}
    >
      {now}
    </span>
  );
}

// Lit: the kobold you came from, shown by a soft glow around its face and
// its name in blue, never a frame.
function glow(member: Member, lit: boolean) {
  return lit
    ? {
        filter: `drop-shadow(0 0 7px ${member.color}) drop-shadow(0 0 2px ${member.color})`,
      }
    : undefined;
}

function Station({
  member,
  now,
  lit,
  open,
  onPick,
  size = 72,
}: Readonly<{
  member: Member;
  now: string | null;
  lit: boolean;
  open: boolean;
  onPick: () => void;
  size?: number;
}>) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-expanded={open}
      aria-current={lit ? "true" : undefined}
      className="group grid min-w-0 cursor-pointer content-start justify-items-center gap-0.5 rounded-lg px-1.5 pt-3 pb-2.5 text-center focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none"
    >
      <span
        className="transition-transform duration-150 group-hover:-translate-y-0.5"
        style={glow(member, lit)}
      >
        <Figure member={member} working={now !== null} size={size} />
      </span>
      <span
        className={cn(
          "mt-2 text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4",
          lit && "text-blue",
          open && "underline underline-offset-4",
        )}
      >
        {member.name}
      </span>
      <span className="text-[11.5px] text-muted-foreground">{member.role}</span>
      {now && <Now member={member} now={now} className="mt-1" />}
    </button>
  );
}

// A kobold's little card: its job, where it works and what it did last.
function Card({
  member,
  now,
  onClose,
}: Readonly<{ member: Member; now: string | null; onClose: () => void }>) {
  return (
    <section
      aria-label={`${member.name}'s card`}
      className="meet-in relative flex min-w-0 gap-3.5 rounded-2xl bg-surface-2/70 p-4 pr-10"
    >
      <KoboldHead size={48} hat={member.hat} color={member.color} />
      <div className="grid min-w-0 gap-1 text-[13px] leading-snug">
        <span className="font-semibold">
          {member.name}{" "}
          <span className="font-normal text-muted-foreground">
            · {member.role}
          </span>
        </span>
        <span className="break-words">{member.job}</span>
        <span className="break-words text-muted-foreground">
          Works at:{" "}
          {member.page ? (
            <Link
              to={`/${member.page}`}
              onClick={closeTeam}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {member.where}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{member.where}</span>
          )}
        </span>
        <span className="break-words text-muted-foreground">
          {now ? "Now" : "Last did"}:{" "}
          <span className="text-foreground">{now ?? member.last}</span>
        </span>
        {now && (
          <span className="break-words text-muted-foreground">
            Last did: <span className="text-foreground">{member.last}</span>
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label="Close card"
        onClick={onClose}
        className="absolute top-3 right-3 grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 [&_svg]:size-3.5"
      >
        <X aria-hidden />
      </button>
    </section>
  );
}

// Sprocket on top, a bit bigger: the supervisor of the team.
function Supervisor({
  now,
  lit,
  open,
  onPick,
}: Readonly<{
  now: string | null;
  lit: boolean;
  open: boolean;
  onPick: () => void;
}>) {
  const member = memberOf("support");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-expanded={open}
      aria-current={lit ? "true" : undefined}
      className="group flex min-w-0 cursor-pointer flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg px-5 py-2 text-left focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none"
    >
      <span
        className="transition-transform duration-150 group-hover:-translate-y-0.5"
        style={glow(member, lit)}
      >
        <Figure member={member} working={now !== null} size={84} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5 sm:min-w-[260px] sm:max-w-[560px]">
        <span
          className={cn(
            "text-[16px] font-semibold tracking-[-0.01em]",
            lit && "text-blue",
            open && "underline underline-offset-4",
          )}
        >
          Sprocket{" "}
          <span className="text-[13px] font-normal text-muted-foreground no-underline">
            · looks after the team and answers you, on every page
          </span>
        </span>
        {now && <Now member={member} now={now} className="mt-1" />}
      </span>
    </button>
  );
}

export function Workshop({
  now,
  focus,
}: Readonly<{ now: Record<string, string>; focus: string | null }>) {
  const [picked, setPicked] = useState<string | null>(null);
  const toggle = (id: string) => {
    setPicked((was) => (was === id ? null : id));
  };
  const cards: ReactNode = picked && (
    <Card
      member={memberOf(picked)}
      now={now[picked] ?? null}
      onClose={() => {
        setPicked(null);
      }}
    />
  );
  return (
    <div className="grid min-h-0 gap-3 overflow-y-auto bg-card px-6 pt-2 pb-6">
      <Supervisor
        now={now.support ?? null}
        lit={focus === "support"}
        open={picked === "support"}
        onPick={() => {
          toggle("support");
        }}
      />
      <div className="grid grid-cols-2 items-start gap-1 md:grid-cols-5">
        {STATIONS.map((id) => (
          <Station
            key={id}
            member={memberOf(id)}
            now={now[id] ?? null}
            lit={focus === id}
            open={picked === id}
            onPick={() => {
              toggle(id);
            }}
          />
        ))}
      </div>
      {cards}
    </div>
  );
}
