// What each Kobble release changes for the team, in plain words (made up):
// a short title and one or two sentences per change, as the team sees it on
// its pages. Upgrading is automatic, so nothing here says what to do. The
// list is what this computer's copy of Kobble knows, so it needs no GitHub.
// CURRENT is the version it runs.

import type { Locale } from "@/i18n/locale";

export const CURRENT = "0.13.2";

export type Kind = "New" | "Changed" | "Fixed";
export const KINDS: Kind[] = ["New", "Changed", "Fixed"];

type Words = Record<Locale, string>;
export type Entry = { kind: Kind; title: Words; text: Words; more?: Words };
export type Release = { version: string; date: string; entries: Entry[] };

// The release on its way (its number is the one found).
export const ON_ITS_WAY: Omit<Release, "version"> = {
  date: "2026-11-28",
  entries: [
    {
      kind: "New",
      title: {
        en: "What changed, in one list",
        it: "Cosa è cambiato, in un elenco",
        de: "Was sich geändert hat, in einer Liste",
      },
      text: {
        en: "Settings › Updates lists every release with what it changes for you, newest first.",
        it: "Impostazioni › Aggiornamenti elenca ogni versione con ciò che cambia per voi, la più recente per prima.",
        de: "Einstellungen › Updates listet jede Version mit dem, was sich für euch ändert, die neueste zuerst.",
      },
    },
    {
      kind: "Fixed",
      title: {
        en: "A card stays open",
        it: "Una scheda resta aperta",
        de: "Eine Karte bleibt offen",
      },
      text: {
        en: "A card you opened beside the board no longer closes by itself while the builder reads the board again.",
        it: "Una scheda aperta accanto alla bacheca non si chiude più da sola mentre il costruttore rilegge la bacheca.",
        de: "Eine neben dem Board geöffnete Karte schließt sich nicht mehr von selbst, wenn der Builder das Board neu liest.",
      },
    },
  ],
};

export const CHANGELOG: Release[] = [
  {
    version: "0.13.2",
    date: "2026-11-21",
    entries: [
      {
        kind: "New",
        title: {
          en: "Send feedback from anywhere",
          it: "Invia un feedback da ovunque",
          de: "Feedback von überall senden",
        },
        text: {
          en: "Sprocket's window opens from the sidebar and the post builds itself while you talk.",
          it: "La finestra di Sprocket si apre dalla barra laterale e il messaggio si scrive da solo mentre parli.",
          de: "Sprockets Fenster öffnet sich in der Seitenleiste und der Beitrag schreibt sich, während du sprichst.",
        },
        more: {
          en: "When you send it, it goes to the people who make Kobble, and you can follow it here: sent, seen, planned, done. Anything that looks like your team's data is marked, so you can take it out first.",
          it: "Quando lo invii, arriva alle persone che fanno Kobble e puoi seguirlo qui: inviato, visto, pianificato, fatto. Ciò che sembra un dato del vostro team è segnato, così puoi toglierlo prima.",
          de: "Beim Senden geht er an die Leute, die Kobble machen, und du kannst ihn hier verfolgen: gesendet, gesehen, geplant, erledigt. Was nach Daten eures Teams aussieht, ist markiert, damit du es vorher entfernen kannst.",
        },
      },
      {
        kind: "New",
        title: {
          en: "Feedback from other teams becomes signals",
          it: "Il feedback di altri team diventa segnali",
          de: "Feedback anderer Teams wird zu Signalen",
        },
        text: {
          en: "Open posts from the public feedback board show up on Signals, matched to the persona they fit best.",
          it: "I messaggi aperti della bacheca pubblica compaiono in Segnali, abbinati al persona più adatto.",
          de: "Offene Beiträge der öffentlichen Feedback-Seite erscheinen bei Signale, der passendsten Persona zugeordnet.",
        },
      },
      {
        kind: "Changed",
        title: {
          en: "Buttons have icons",
          it: "I pulsanti hanno icone",
          de: "Buttons haben Icons",
        },
        text: {
          en: "Every button has a small picture before its words, the same one for the same action.",
          it: "Ogni pulsante ha una piccola immagine prima delle parole, la stessa per la stessa azione.",
          de: "Jeder Button hat ein kleines Bild vor seinen Worten, dasselbe für dieselbe Aktion.",
        },
        more: {
          en: "A card's pull request button now has the colour of its state: green ready for review, grey draft or closed, purple merged, red when it clashes with the main version.",
          it: "Il pulsante della pull request di una scheda ha ora il colore del suo stato: verde pronta per la revisione, grigio bozza o chiusa, viola unita, rosso quando è in conflitto con la versione principale.",
          de: "Der Pull-Request-Button einer Karte hat jetzt die Farbe seines Zustands: grün bereit zur Prüfung, grau Entwurf oder geschlossen, lila übernommen, rot bei Konflikt mit der Hauptversion.",
        },
      },
      {
        kind: "Fixed",
        title: {
          en: "Every word in three languages",
          it: "Ogni parola in tre lingue",
          de: "Jedes Wort in drei Sprachen",
        },
        text: {
          en: "Sprocket's window, All quiet on Signals and the labels screen readers hear are now in Italian and German too.",
          it: "La finestra di Sprocket, Tutto tranquillo in Segnali e le etichette per gli screen reader sono ora anche in italiano e tedesco.",
          de: "Sprockets Fenster, Alles ruhig bei Signale und die Bezeichnungen für Screenreader gibt es jetzt auch auf Italienisch und Deutsch.",
        },
      },
      {
        kind: "Fixed",
        title: {
          en: "No more blank page",
          it: "Niente più pagina vuota",
          de: "Keine leere Seite mehr",
        },
        text: {
          en: "A Kobble page left open while Kobble updated loads itself again instead of showing a blank canvas.",
          it: "Una pagina di Kobble lasciata aperta durante l'aggiornamento si ricarica da sola invece di mostrare una tela vuota.",
          de: "Eine Kobble-Seite, die beim Update offen blieb, lädt sich neu, statt eine leere Fläche zu zeigen.",
        },
      },
    ],
  },
  {
    version: "0.13.1",
    date: "2026-11-14",
    entries: [
      {
        kind: "New",
        title: {
          en: "Resolve a clash with one press",
          it: "Risolvi un conflitto con un clic",
          de: "Einen Konflikt mit einem Klick lösen",
        },
        text: {
          en: "A card that says “Clashes with main” has a Resolve button: it goes back to To do and the builder settles the clash.",
          it: "Una scheda con «In conflitto con main» ha un pulsante Risolvi: torna in Da fare e il costruttore risolve il conflitto.",
          de: "Eine Karte mit „Kollidiert mit main“ hat einen Lösen-Button: Sie geht zurück zu To do und der Builder löst den Konflikt.",
        },
      },
      {
        kind: "Changed",
        title: {
          en: "One prototype per exploration",
          it: "Un prototipo per esplorazione",
          de: "Ein Prototyp pro Erkundung",
        },
        text: {
          en: "A new question on the board no longer starts a second prototype: its options become variants of the one you have.",
          it: "Una nuova domanda sulla lavagna non avvia più un secondo prototipo: le sue opzioni diventano varianti di quello che hai.",
          de: "Eine neue Frage auf dem Board startet keinen zweiten Prototyp mehr: Ihre Optionen werden Varianten des vorhandenen.",
        },
      },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-11-07",
    entries: [
      {
        kind: "Changed",
        title: {
          en: "Ideas without a screen",
          it: "Idee senza schermata",
          de: "Ideen ohne Bildschirm",
        },
        text: {
          en: "An idea that changes no screen goes to the builder without a prototype, as a card with what you agreed.",
          it: "Un'idea che non cambia nessuna schermata passa al costruttore senza prototipo, come scheda con ciò che avete concordato.",
          de: "Eine Idee, die keinen Bildschirm ändert, geht ohne Prototyp an den Builder, als Karte mit dem, was ihr vereinbart habt.",
        },
      },
    ],
  },
];
