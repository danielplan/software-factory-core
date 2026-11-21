// The Releases page: the coming release, its number and why, what was
// merged since the last one, and the past releases with their notes.

import { area } from "../define.ts";

const en = {
  about: "Turn everything merged so far into a numbered release.",
  coming: "The coming release",
  releaseNow: (number: string) => `Release ${number}`,
  releasing: "Releasing…",
  prepare: "Prepare the release",
  preparing: "Reading what was merged…",
  prepareAbout:
    "The kobold reads what was merged and suggests the number, only when you press Prepare.",
  next: "Next:",
  change: "Change",
  numberLabel: "The number of the release",
  useSuggested: (number: string) => `Use ${number}`,
  useSuggestedLabel: (number: string) => `Go back to the suggested ${number}`,
  notANumber: "Use three numbers with dots, like 1.4.3.",
  notHigher: (last: string) => `It has to be higher than ${last}.`,
  whyUnknown:
    "The kobold could not tell what changes for people, so check this number.",
  first: "This is the first release: everything merged so far is in it.",
  merged: (count: number, last: string | null) =>
    last
      ? `Merged since ${last} (${String(count)})`
      : `Merged so far (${String(count)})`,
  nothing: (last: string | null) =>
    last ? `Nothing merged since ${last}.` : "Nothing merged yet.",
  openPullRequest: (number: number) => `Open #${String(number)} on GitHub`,
  past: "Past releases",
  noPast: "No release yet.",
  noNotes: "No notes.",
  showNotes: (number: string) => `Show the notes of ${number}`,
  reading: "Reading the merged work and the releases from GitHub…",
  didNotWork: "The release did not work",
  couldNotRead: "The releases could not be read",
  needsRepository: {
    title: "Releases need a GitHub repository",
    text: "A release is a tag and a release on GitHub, so a repository has to be connected first.",
    link: "Connect one in Settings, under Where work is tracked.",
  },
};

export const releases = area(
  en,
  {
    about:
      "Trasforma tutto ciò che è stato unito finora in una release numerata.",
    coming: "La prossima release",
    releaseNow: (number) => `Rilascia ${number}`,
    releasing: "Rilascio in corso…",
    prepare: "Prepara il rilascio",
    preparing: "Leggo ciò che è stato unito…",
    prepareAbout:
      "Il kobold legge ciò che è stato unito e suggerisce il numero, solo quando premi Prepara.",
    next: "Prossima:",
    change: "Cambia",
    numberLabel: "Il numero della release",
    useSuggested: (number) => `Usa ${number}`,
    useSuggestedLabel: (number) => `Torna al numero suggerito ${number}`,
    notANumber: "Usa tre numeri separati da punti, come 1.4.3.",
    notHigher: (last) => `Deve essere più alto di ${last}.`,
    whyUnknown:
      "Il kobold non ha saputo dire cosa cambia per le persone: controlla questo numero.",
    first: "È la prima release: dentro c'è tutto ciò che è stato unito finora.",
    merged: (count, last) =>
      last
        ? `Unito dopo ${last} (${String(count)})`
        : `Unito finora (${String(count)})`,
    nothing: (last) =>
      last ? `Niente di unito dopo ${last}.` : "Ancora niente di unito.",
    openPullRequest: (number) => `Apri #${String(number)} su GitHub`,
    past: "Release precedenti",
    noPast: "Ancora nessuna release.",
    noNotes: "Nessuna nota.",
    showNotes: (number) => `Mostra le note di ${number}`,
    reading: "Leggo da GitHub il lavoro unito e le release…",
    didNotWork: "La release non è riuscita",
    couldNotRead: "Non è stato possibile leggere le release",
    needsRepository: {
      title: "Le release hanno bisogno di un repository GitHub",
      text: "Una release è un tag e una release su GitHub, quindi prima va collegato un repository.",
      link: "Collegane uno in Impostazioni, sotto Dove si tiene traccia del lavoro.",
    },
  },
  {
    about:
      "Machen Sie aus allem, was bisher zusammengeführt wurde, ein nummeriertes Release.",
    coming: "Das kommende Release",
    releaseNow: (number) => `Release ${number}`,
    releasing: "Wird veröffentlicht…",
    prepare: "Release vorbereiten",
    preparing: "Lese, was zusammengeführt wurde…",
    prepareAbout:
      "Der Kobold liest, was zusammengeführt wurde, und schlägt die Nummer vor, erst wenn du auf Vorbereiten drückst.",
    next: "Nächste:",
    change: "Ändern",
    numberLabel: "Die Nummer des Releases",
    useSuggested: (number) => `${number} nehmen`,
    useSuggestedLabel: (number) => `Zurück zur vorgeschlagenen ${number}`,
    notANumber: "Drei Zahlen mit Punkten, zum Beispiel 1.4.3.",
    notHigher: (last) => `Sie muss höher sein als ${last}.`,
    whyUnknown:
      "Der Kobold konnte nicht sagen, was sich für die Leute ändert. Bitte prüfen Sie diese Nummer.",
    first:
      "Das ist das erste Release: alles, was bisher zusammengeführt wurde, ist darin.",
    merged: (count, last) =>
      last
        ? `Zusammengeführt seit ${last} (${String(count)})`
        : `Bisher zusammengeführt (${String(count)})`,
    nothing: (last) =>
      last
        ? `Seit ${last} wurde nichts zusammengeführt.`
        : "Noch nichts zusammengeführt.",
    openPullRequest: (number) => `#${String(number)} auf GitHub öffnen`,
    past: "Frühere Releases",
    noPast: "Noch kein Release.",
    noNotes: "Keine Notizen.",
    showNotes: (number) => `Notizen von ${number} anzeigen`,
    reading:
      "Das zusammengeführte Werk und die Releases werden von GitHub gelesen…",
    didNotWork: "Das Release hat nicht geklappt",
    couldNotRead: "Die Releases konnten nicht gelesen werden",
    needsRepository: {
      title: "Releases brauchen ein GitHub-Repository",
      text: "Ein Release ist ein Tag und ein Release auf GitHub, darum muss zuerst ein Repository verbunden sein.",
      link: "Verbinden Sie eines in den Einstellungen, unter Wo die Arbeit verfolgt wird.",
    },
  },
);
