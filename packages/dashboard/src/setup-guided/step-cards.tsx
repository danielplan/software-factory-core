// A step's cards, laid out as the design has them: apps as tiles and the
// rest as rows on "Your product"; the people with the kobold their persona
// will have, and New persona; on "Team and board" the people as rows and
// the board as a card of its own; rows for "Bring over"; starting points
// to pick from. Every card can be taken off or asked about.

import { useState } from "react";

import { type Card, messageOf, post } from "@/api";

import { initialsOf, isApp, isHowReal, isPerson } from "./card-bits";
import { BigRow, NewPersona, PersonRow, Row, Tile } from "./card-views";
import { HowFar } from "./how-far";
import { TeamTiles } from "./team-tiles";

export type CardActs = {
  asked: string[];
  onAsk: (id: string) => void;
  onRemove: (id: string) => void;
};

export function StepCards({
  cards,
  stepId,
  area,
  asked,
  onAsk,
}: Readonly<{
  cards: Card[];
  stepId: string;
  area: string;
  asked: string[];
  onAsk: (id: string) => void;
}>) {
  const [problem, setProblem] = useState<string | null>(null);
  const acts: CardActs = {
    asked,
    onAsk,
    onRemove: (id) => {
      post("/api/setup/draft", { remove: id }).catch((error: unknown) => {
        setProblem(messageOf(error));
      });
    },
  };
  const shown = cards.filter(
    (card) => !(card.tone === "question" && !card.confirmed),
  );
  return (
    <div className="grid gap-3">
      <Body
        stepId={stepId}
        area={area}
        cards={shown}
        acts={acts}
        onProblem={setProblem}
      />
      {problem && <p className="text-sm text-destructive">{problem}</p>}
    </div>
  );
}

function Body({
  stepId,
  area,
  cards,
  acts,
  onProblem,
}: Readonly<{
  stepId: string;
  area: string;
  cards: Card[];
  acts: CardActs;
  onProblem: (problem: string | null) => void;
}>) {
  if (stepId === "product") return <Product cards={cards} acts={acts} />;
  if (stepId === "people")
    return (
      <Grid>
        {cards.map((card) => (
          <Tile key={card.id} card={card} acts={acts} person />
        ))}
        <NewPersona area={area} onProblem={onProblem} />
      </Grid>
    );
  if (stepId === "team") return <Team cards={cards} acts={acts} />;
  if (stepId === "start")
    return (
      <div className="grid gap-3">
        {cards.map((card) => (
          <BigRow key={card.id} card={card} acts={acts} />
        ))}
      </div>
    );
  if (stepId === "bring") return <Rows cards={cards} acts={acts} />;
  if (stepId === "how")
    return (
      <>
        <Section title="For everyone" />
        <TeamTiles />
        {cards.length > 0 && <Section title="Add-ons" />}
        <Grid>
          {cards.map((card) => (
            <Tile key={card.id} card={card} acts={acts} />
          ))}
        </Grid>
      </>
    );
  return (
    <Grid>
      {cards.map((card) => (
        <Tile key={card.id} card={card} acts={acts} />
      ))}
    </Grid>
  );
}

function Product({ cards, acts }: Readonly<{ cards: Card[]; acts: CardActs }>) {
  const howReal = cards.find(isHowReal);
  const apps = cards.filter(isApp);
  const rest = cards.filter((card) => card !== howReal && !isApp(card));
  return (
    <>
      {howReal && <HowFar card={howReal} />}
      <Section title="Apps I found" note={`${String(apps.length)} apps`} />
      <Grid>
        {apps.map((card) => (
          <Tile key={card.id} card={card} acts={acts} app />
        ))}
      </Grid>
      {rest.length > 0 && <Section title="Also in your project" />}
      {rest.length > 0 && <Rows cards={rest} acts={acts} />}
    </>
  );
}

function Team({ cards, acts }: Readonly<{ cards: Card[]; acts: CardActs }>) {
  const people = cards.filter(isPerson);
  const rest = cards.filter((card) => !isPerson(card));
  return (
    <>
      <div className="rounded-[20px] bg-card shadow-card">
        {people.map((card) => (
          <PersonRow
            key={card.id}
            card={card}
            acts={acts}
            initials={initialsOf(card.title)}
          />
        ))}
        <p className="border-t border-border-soft px-[18px] py-3 text-right text-[12.5px] text-muted-foreground">
          Everyone can do everything. Kobble only uses this list to recognise
          who is at a computer.
        </p>
      </div>
      {rest.length > 0 && <Section title="Your board" />}
      {rest.length > 0 && <Rows cards={rest} acts={acts} />}
    </>
  );
}

function Rows({ cards, acts }: Readonly<{ cards: Card[]; acts: CardActs }>) {
  return (
    <div className="rounded-[20px] bg-card shadow-card">
      {cards.map((card) => (
        <Row key={card.id} card={card} acts={acts} />
      ))}
    </div>
  );
}

function Grid({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
      {children}
    </div>
  );
}

function Section({ title, note }: Readonly<{ title: string; note?: string }>) {
  return (
    <div className="mt-4 flex items-center justify-between text-[15px] font-semibold">
      {title}
      {note && (
        <span className="text-[12.5px] font-normal text-muted-foreground">
          {note}
        </span>
      )}
    </div>
  );
}
