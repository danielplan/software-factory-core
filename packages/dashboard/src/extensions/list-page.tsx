// Variant C: a short list, and a page for each extension: what it adds and
// needs, who made it, its settings and its changes.

import { ArrowLeft, ChevronRight } from "lucide-react";

import { PageHead } from "@/components/page-head";
import type { FactoryState } from "@/dashboard/dashboard";
import { GroupForm } from "@/dashboard/settings-card";

import { Adds, Logo, Maker, Needs, OnOff } from "./bits";
import { type Ext, makerOf, useExtensions } from "./data";

export function ListPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const { all, turn } = useExtensions(state);
  const ext = all.find((e) => e.id === open);
  if (ext) return <Detail ext={ext} state={state} turn={turn} />;
  return (
    <div className="grid gap-5">
      <PageHead
        title="Extensions"
        about="What your factory can do beyond the core. Open one to see everything about it."
      />
      <div className="overflow-hidden rounded-xl bg-card shadow-soft">
        {all.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3.5 border-t border-border-soft px-4 py-3 first:border-t-0"
          >
            <a
              href={`#extensions/${e.id}`}
              className="flex min-w-0 flex-1 items-center gap-3.5 hover:opacity-80"
            >
              <Logo ext={e} />
              <span className="grid min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">{e.name}</span>
                  <Maker ext={e} />
                </span>
                <span className="truncate text-xs text-muted-foreground">{e.about}</span>
              </span>
              <ChevronRight aria-hidden className="ml-auto size-4 flex-none text-muted-foreground" />
            </a>
            <OnOff ext={e} turn={turn} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({
  ext,
  state,
  turn,
}: Readonly<{
  ext: Ext;
  state: FactoryState;
  turn: (id: string, on: boolean) => void;
}>) {
  const groups = ext.on
    ? state.settings.filter((group) => ext.settings.includes(group.id))
    : [];
  return (
    <div className="grid max-w-[760px] gap-5">
      <a
        href="#extensions"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Extensions
      </a>
      <div className="flex flex-wrap items-center gap-4">
        <Logo ext={ext} big />
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="truncate text-[22px] leading-tight font-semibold tracking-[-0.015em]">
            {ext.name}
          </h1>
          <p className="text-[13px] text-muted-foreground">{ext.about}</p>
        </div>
        <OnOff ext={ext} turn={turn} />
      </div>
      <Block title="What it adds">
        <Adds ext={ext} />
      </Block>
      <Block title="What it needs">
        <Needs ext={ext} />
      </Block>
      <Block title="Who made it">
        <p className="text-[13px]">
          {ext.maker === "kobble"
            ? "Kobble. It comes with the factory and is kept up to date for you."
            : `${makerOf(ext)}, written by the kobold. Only your team can change it.`}
        </p>
      </Block>
      <Block title="Settings">
        {groups.length > 0 ? (
          <div className="grid gap-4">
            {groups.map((group) => (
              <GroupForm key={group.id} group={group} state={state} />
            ))}
          </div>
        ) : ext.fields.length > 0 ? (
          <dl className="grid gap-1.5 text-[13px]">
            {ext.fields.map((f) => (
              <div key={f.label} className="flex gap-3">
                <dt className="w-[160px] text-muted-foreground">{f.label}</dt>
                <dd className="break-words">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            {ext.on ? "It has no settings." : "Switch it on to see its settings."}
          </p>
        )}
      </Block>
      <Block title="Its changes">
        {ext.changes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No changes yet.</p>
        ) : (
          <ul className="grid gap-1.5 text-[13px]">
            {ext.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

function Block({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-2 rounded-xl bg-card p-4 shadow-soft">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}
