// The "Your kobolds" panel as a little workshop of who they are, on the grey
// ground. Sprocket on top, a bit bigger, looks after the team; below it
// Sieve, Doodle, Tinker (Doodle's helper), Bolt and Mimic side by side. A
// kobold at work moves a little and says what it does now; a resting one
// sleeps, eyes closed, breathing gently. A click opens its card. Nothing
// moves when the computer asks for calm.

import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { KoboldHead } from "@/components/kobold-face";
import { type Member, memberOf, type TeamId } from "@/lib/kobolds";
import { closeTeam } from "@/lib/meet";
import { isLit, isWorking, lineOf, type Now } from "@/lib/meet-view";
import { cn } from "@/lib/utils";

import { Figure } from "./figure";

const STATIONS: TeamId[] = ["sorter", "explorer", "maker", "builder", "tester"];

// What the kobold does now, in the quiet grey of secondary text (no colour).
function Now({
  now,
  className,
}: Readonly<{ now: string; className?: string }>) {
  return (
    <span
      className={cn(
        "line-clamp-4 text-[11.5px] leading-snug break-words text-muted-foreground [overflow-wrap:anywhere]",
        className,
      )}
      title={now}
    >
      {now}
    </span>
  );
}

// Lit: the kobold you came from, shown by a faint light behind its face,
// never a frame; its name stays as it is.
function Lit({
  member,
  lit,
  children,
}: Readonly<{ member: Member; lit: boolean; children: ReactNode }>) {
  return (
    <span className="relative grid place-items-center transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
      {lit && (
        <span
          aria-hidden
          className="absolute -inset-4 rounded-full"
          style={{
            background: `radial-gradient(closest-side, ${member.color}26, transparent)`,
          }}
        />
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

function Station({
  member,
  now,
  lit,
  open,
  onPick,
}: Readonly<{
  member: Member;
  now: string | null;
  lit: boolean;
  open: boolean;
  onPick: () => void;
}>) {
  const t = useTranslation().t;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-expanded={open}
      aria-current={lit ? "true" : undefined}
      className="group grid min-w-0 cursor-pointer content-start justify-items-center gap-0.5 rounded-lg px-1.5 pt-3 pb-2.5 text-center focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none"
    >
      <Lit member={member} lit={lit}>
        <Figure member={member} working={now !== null} size={72} />
      </Lit>
      <span
        className={cn(
          "mt-2 text-[14px] font-semibold text-foreground group-hover:underline group-hover:underline-offset-4",
          open && "underline underline-offset-4",
        )}
      >
        {member.name}
      </span>
      <span className="text-[11.5px] text-muted-foreground">
        {t(`meet.roles.${member.id}`)}
      </span>
      {now && <Now now={now} className="mt-1" />}
    </button>
  );
}

// A kobold's little card: its job, where it works and what it did last.
function Card({
  member,
  now,
  last,
  onClose,
}: Readonly<{
  member: Member;
  now: string | null;
  last: string | null;
  onClose: () => void;
}>) {
  const t = useTranslation().t;
  return (
    <section
      aria-label={t("meet.card.of", { name: member.name })}
      className="relative flex min-w-0 gap-3.5 rounded-2xl bg-card p-4 pr-10 meet-in"
    >
      <KoboldHead size={48} hat={member.hat} color={member.color} />
      <div className="grid min-w-0 gap-1 text-[13px] leading-snug">
        <span className="font-semibold text-foreground">
          {member.name}{" "}
          <span className="font-normal text-muted-foreground">
            · {t(`meet.roles.${member.id}`)}
          </span>
        </span>
        <span className="break-words text-foreground">
          {t(`meet.jobs.${member.id}`)}
        </span>
        <span className="break-words text-muted-foreground">
          {t("meet.card.worksAt")}{" "}
          {member.page ? (
            <Link
              to={`/${member.page}`}
              onClick={closeTeam}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {t(`meet.where.${member.id}`)}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {t(`meet.where.${member.id}`)}
            </span>
          )}
        </span>
        {now && (
          <span className="break-words text-muted-foreground">
            {t("meet.card.now")}: <span className="text-foreground">{now}</span>
          </span>
        )}
        <span className="break-words text-muted-foreground">
          {t("meet.card.lastDid")}:{" "}
          <span className="text-foreground">
            {last ?? t("meet.card.nothingYet")}
          </span>
        </span>
      </div>
      <button
        type="button"
        aria-label={t("meet.card.close")}
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
  const t = useTranslation().t;
  const member = memberOf("support");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-expanded={open}
      aria-current={lit ? "true" : undefined}
      className="group flex min-w-0 cursor-pointer flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg px-5 py-2 text-left focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none"
    >
      <Lit member={member} lit={lit}>
        <Figure member={member} working={now !== null} size={84} />
      </Lit>
      <span className="grid min-w-0 flex-1 gap-0.5 sm:max-w-[560px] sm:min-w-[260px]">
        <span
          className={cn(
            "text-[16px] font-semibold tracking-[-0.01em] text-foreground",
            open && "underline underline-offset-4",
          )}
        >
          {member.name}{" "}
          <span className="text-[13px] font-normal text-muted-foreground no-underline">
            · {t("meet.supervisor")}
          </span>
        </span>
        {now && <Now now={now} className="mt-1" />}
      </span>
    </button>
  );
}

export function Workshop({
  now,
  last,
  focus,
}: Readonly<{ now: Now; last: Now; focus: TeamId | null }>) {
  const [picked, setPicked] = useState<TeamId | null>(null);
  const toggle = (id: TeamId) => {
    setPicked((was) => (was === id ? null : id));
  };
  const card: ReactNode = picked && (
    <Card
      member={memberOf(picked)}
      now={lineOf(now, last, picked).now}
      last={lineOf(now, last, picked).last}
      onClose={() => {
        setPicked(null);
      }}
    />
  );
  return (
    <div className="grid min-h-0 gap-4 overflow-y-auto bg-ground px-6 pt-5 pb-6">
      <div className="grid gap-2 rounded-2xl bg-surface-2/60 px-3 pt-3 pb-3">
        <Supervisor
          now={now.support ?? null}
          lit={isLit(focus, "support")}
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
              now={isWorking(now, id) ? (now[id] ?? null) : null}
              lit={isLit(focus, id)}
              open={picked === id}
              onPick={() => {
                toggle(id);
              }}
            />
          ))}
        </div>
      </div>
      {card}
    </div>
  );
}
