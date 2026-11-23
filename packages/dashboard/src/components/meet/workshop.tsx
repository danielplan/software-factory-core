// PROTOTYPE, "Meet the kobolds": the "Your kobolds" panel as a little
// workshop. The kobolds stand at their stations along the line work travels
// (Sieve sorts what comes in, Doodle thinks it through, Tinker makes the
// screens to try, Bolt builds what you agreed, Mimic tries it as your
// personas), with what is passed along written on the arrows. Sprocket
// stands apart. A kobold at work moves in its own way and says what it does
// and what that means for you; a resting one dozes. A click opens its card.

import { ArrowDown, ArrowRight, ArrowUp, X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";

import { KoboldHead } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { closeTeam, type Member, memberOf } from "./meet";

const STATIONS = ["sorter", "explorer", "maker", "builder", "tester"];
const PASSES = ["a signal", "an idea", "a prototype", "a card"];
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
// with its prop; resting it dozes under a few z.
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
      {!working && (
        <span className="pointer-events-none absolute -top-1 -right-1 text-[11px] font-semibold text-faint">
          <span className="meet-zzz inline-block">z</span>
          <span
            className="meet-zzz inline-block"
            style={{ animationDelay: "0.9s" }}
          >
            z
          </span>
        </span>
      )}
    </span>
  );
}

// What the kobold says it does now and what that means for you.
function Bubble({
  member,
  now,
  side = false,
}: Readonly<{ member: Member; now: string; side?: boolean }>) {
  return (
    <span
      className={cn(
        "relative grid w-full gap-1 rounded-xl bg-card p-2 text-left text-[11.5px] leading-snug shadow-card ring-1 ring-border",
        side ? "ml-2" : "mt-1.5",
      )}
      style={{ boxShadow: `0 0 0 1px ${member.color}33` }}
    >
      <span
        aria-hidden
        className={cn(
          "absolute size-2.5 rotate-45 bg-card",
          side
            ? "top-1/2 -left-[5px] -translate-y-1/2"
            : "-top-[5px] left-1/2 -translate-x-1/2",
        )}
        style={{
          borderTop: `1px solid ${member.color}55`,
          borderLeft: `1px solid ${member.color}55`,
        }}
      />
      <span
        className="line-clamp-4 font-medium break-words [overflow-wrap:anywhere]"
        style={{ color: member.color }}
        title={now}
      >
        {now}
      </span>
      <span className="line-clamp-3 break-words text-muted-foreground">
        For you: {member.meanwhile}
      </span>
    </span>
  );
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
      className={cn(
        "group grid min-w-0 cursor-pointer content-start justify-items-center gap-0.5 rounded-2xl px-1.5 pt-3 pb-2.5 text-center transition-colors duration-150 hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none",
        lit && "bg-picked ring-2 ring-blue/40 hover:bg-picked",
        open && !lit && "bg-card/70",
      )}
    >
      <Figure member={member} working={now !== null} size={size} />
      <span
        aria-hidden
        className="mt-0.5 h-1.5 w-16 rounded-full"
        style={{ background: `${member.color}33` }}
      />
      <span className="mt-1 text-[14px] font-semibold">{member.name}</span>
      <span className="text-[11.5px] text-muted-foreground">{member.step}</span>
      {now ? (
        <Bubble member={member} now={now} />
      ) : (
        <span className="mt-1.5 text-[11.5px] text-faint italic">resting</span>
      )}
    </button>
  );
}

// What is passed from one station to the next, written on its arrow.
function Pass({ label }: Readonly<{ label: string }>) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-1 py-0.5 md:mt-9 md:flex-col md:self-start md:py-0"
    >
      <span className="rounded-full bg-card px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-muted-foreground ring-1 ring-border">
        {label}
      </span>
      <ArrowDown className="size-3.5 text-faint md:hidden" />
      <span className="hidden items-center text-faint md:flex">
        <span
          className="meet-flow h-px w-9"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 50%, transparent 50%)",
            backgroundSize: "6px 1px",
          }}
        />
        <ArrowRight className="-ml-1 size-3.5" />
      </span>
    </div>
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
      className="meet-in relative flex min-w-0 gap-3.5 rounded-2xl bg-card p-4 pr-10 shadow-card ring-1"
      style={{ ["--tw-ring-color" as string]: `${member.color}55` }}
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

// Sprocket stands apart from the line: one wide row of its own.
function SprocketRow({
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
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-border px-4 py-3 text-left transition-colors hover:bg-surface-2/60 focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none",
        lit && "border-solid bg-picked ring-2 ring-blue/40 hover:bg-picked",
        open && !lit && "bg-surface-2/60",
      )}
    >
      <Figure member={member} working={now !== null} size={52} />
      <span className="grid min-w-0 flex-none gap-0.5 sm:w-[260px]">
        <span className="text-[14px] font-semibold">
          Sprocket{" "}
          <span className="text-[12px] font-normal text-muted-foreground">
            · stands apart
          </span>
        </span>
        <span className="text-[12px] text-muted-foreground">
          here to answer, on every page
        </span>
      </span>
      {now ? (
        <span className="hidden min-w-0 flex-1 sm:block">
          <Bubble member={member} now={now} side />
        </span>
      ) : (
        <span className="text-[11.5px] text-faint italic">resting</span>
      )}
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
    <div className="grid min-h-0 gap-4 overflow-y-auto bg-ground px-6 pt-5 pb-6">
      <div className="rounded-2xl border border-border-soft bg-surface-2/60 px-3 pt-1 pb-4">
        <p className="px-2 pt-2 pb-1 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
          How work travels
        </p>
        <div className="grid items-start md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
          {STATIONS.map((id, at) => (
            <Fragment key={id}>
              {at > 0 && <Pass label={PASSES[at - 1]} />}
              <Station
                member={memberOf(id)}
                now={now[id] ?? null}
                lit={focus === id}
                open={picked === id}
                onPick={() => {
                  toggle(id);
                }}
              />
            </Fragment>
          ))}
        </div>
        <div
          aria-hidden
          className="relative mx-[9%] mt-1 hidden h-7 rounded-b-2xl border-x border-b border-dashed border-faint/60 md:block"
        >
          <ArrowUp className="absolute -top-1 -left-[8px] size-3.5 text-faint" />
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-card px-2.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-muted-foreground ring-1 ring-border">
            a test: what Mimic finds comes back as signals
          </span>
        </div>
      </div>
      {cards}
      <SprocketRow
        now={now.support ?? null}
        lit={focus === "support"}
        open={picked === "support"}
        onPick={() => {
          toggle("support");
        }}
      />
    </div>
  );
}
