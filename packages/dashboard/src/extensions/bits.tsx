// Small pieces the three extensions pages share: who made it, what it
// adds and needs, and the on/off switch.

import {
  Columns3,
  FlaskConical,
  Inbox,
  Mic,
  ShieldCheck,
  ShoppingBag,
  Sunrise,
  Tag,
  Users,
} from "lucide-react";

import { lookOf } from "@/add-ons/looks";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { addsOf, type Ext, makerOf } from "./data";

export function Maker({ ext }: Readonly<{ ext: Ext }>) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-full px-2 text-[11px] font-medium",
        ext.maker === "team"
          ? "bg-wash text-wash-foreground"
          : "bg-surface-2 text-muted-foreground",
      )}
    >
      {makerOf(ext)}
    </span>
  );
}

const LOOKS: Record<string, { icon: React.ReactNode; color: string }> = {
  factory: { icon: <Columns3 aria-hidden />, color: "var(--build)" },
  explorations: { icon: <FlaskConical aria-hidden />, color: "var(--explore)" },
  signals: { icon: <Inbox aria-hidden />, color: "var(--understand)" },
  personas: { icon: <Users aria-hidden />, color: "var(--source-app)" },
  releases: { icon: <Tag aria-hidden />, color: "#8b5cf6" },
  voice: { icon: <Mic aria-hidden />, color: "#0f7f8c" },
  verification: { icon: <ShieldCheck aria-hidden />, color: "#f0603a" },
  standup: { icon: <Sunrise aria-hidden />, color: "#7fb800" },
  github: { icon: lookOf("github").icon, color: "#6366f1" },
  jira: { icon: lookOf("jira").icon, color: "#0ea5e9" },
  "react-web-app": { icon: lookOf("react-web-app").icon, color: "#149eca" },
  "expo-app": { icon: lookOf("expo-app").icon, color: "#7c5cff" },
  "nestjs-backend": { icon: lookOf("nestjs-backend").icon, color: "#e0234e" },
  "sveltekit-app": { icon: lookOf("sveltekit-app").icon, color: "#ff3e00" },
  "shopify-theme": { icon: <ShoppingBag aria-hidden />, color: "#5a863e" },
  "typescript-package": { icon: lookOf("typescript-package").icon, color: "#3178c6" },
};

export function Logo({
  ext,
  big = false,
}: Readonly<{ ext: { id: string }; big?: boolean }>) {
  const own = LOOKS[ext.id] ?? lookOf(ext.id);
  const color = "color" in own ? own.color : own.colour;
  return (
    <span
      aria-hidden
      className={cn(
        "grid flex-none place-items-center",
        big ? "size-12 rounded-xl [&_svg]:size-6" : "size-8 rounded-lg [&_svg]:size-4",
      )}
      style={{
        color,
        backgroundColor: `color-mix(in oklab, ${color} 13%, transparent)`,
      }}
    >
      {own.icon}
    </span>
  );
}

function Row({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function Adds({
  ext,
  skip,
}: Readonly<{ ext: Ext; skip?: string }>) {
  const adds = addsOf(ext).filter((one) => one.kind !== skip);
  if (adds.length === 0)
    return <span className="text-xs text-muted-foreground">Adds nothing yet</span>;
  return (
    <div className="grid gap-1.5">
      {adds.map((one) => (
        <Row key={one.kind} label={one.kind}>
          {one.names.map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs"
            >
              {name}
            </span>
          ))}
        </Row>
      ))}
    </div>
  );
}

export function Needs({ ext }: Readonly<{ ext: Ext }>) {
  return (
    <Row label="Needs">
      <span className="text-xs">
        {ext.needs.length === 0 ? "Nothing" : ext.needs.join(", ")}
      </span>
    </Row>
  );
}

// On or off; a board is changed on Settings, so its switch says where.
export function OnOff({
  ext,
  turn,
}: Readonly<{ ext: Ext; turn: (id: string, on: boolean) => void }>) {
  if (ext.tracker)
    return (
      <a
        href="#settings/connections"
        className="text-xs text-blue hover:underline"
      >
        {ext.on ? "In use · change" : "Use instead"}
      </a>
    );
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {ext.on ? "On" : "Off"}
      <Switch
        checked={ext.on}
        aria-label={`${ext.name} on or off`}
        onCheckedChange={(on) => {
          turn(ext.id, on);
        }}
      />
    </label>
  );
}
