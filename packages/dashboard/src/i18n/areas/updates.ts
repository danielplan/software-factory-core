// Updates: the row in the sidebar and its window, Settings › Updates, the
// desktop start, and the server's steps and reasons said again.

import { area } from "../define.ts";

const en = {
  changes: (count: number) =>
    `${String(count)} ${count === 1 ? "change" : "changes"}`,
  more: (count: number) => `and ${String(count)} more`,
  taking: "Taking the new version from GitHub…",
  restartNote: "The products that run start again with it.",
  blockedTitle: (changes: string) =>
    `New version on GitHub (${changes}), but this folder cannot take it yet`,
  blockedText: (reason: string) =>
    `Nothing was changed, because ${reason}. Save or undo those changes (or ask Claude to tidy up this folder), then press Look again.`,
  newTitle: (changes: string) => `New version on GitHub: ${changes}`,
  newText: "Update takes it now; the products that run start again with it.",
  looking: "Looking on GitHub…",
  looked: (time: string) => ` · looked at ${time}`,
  offline: (looked: string) => `GitHub could not be reached${looked}`,
  updatedAt: (time: string) => ` · updated at ${time}`,
  upToDate: (looked: string, updated: string) =>
    `Up to date with GitHub${looked}${updated}`,
  row: {
    updating: "Updating…",
    takingChanges: "Taking the changes from GitHub",
    cantYet: "Can't update yet",
    ready: (count: number) =>
      `${String(count)} ${count === 1 ? "change" : "changes"} ready`,
    release: (version: string) => `Kobble ${version} is out`,
    preparing: (number: number) => `Being prepared in #${String(number)}`,
    prepare: "Prepare the upgrade for the team",
    updated: "Updated",
    updatedText: (changes: string) => `${changes}, everything started again`,
  },
  release: {
    out: (version: string) => `Kobble ${version} is out`,
    beingPrepared:
      "The builder prepares the upgrade on the board. Once its pull request is merged, every computer takes it with its next update.",
    canPrepare:
      "The builder can prepare the upgrade as a card: the new version, its migrations and the checks, as a pull request for the team to merge.",
    openCard: (number: number) => `Open #${String(number)}`,
    prepare: "Prepare the upgrade",
  },
  lookAgain: "Look again",
  updateNow: "Update now",
  update: "Update",
  byItself: "Update by itself",
  desktop: {
    say: "Open the factory with a double-click from the desktop.",
    put: (file: string) => `Put on the desktop: ${file}`,
    button: "Put a start on the desktop",
  },
  // The server's steps, as it says them while it updates.
  steps: {
    install: "Installing what the changes need",
    factory: "Starting the factory again on the new Kobble",
    products: "Starting the products again",
  },
  // Why this folder cannot take the new version.
  reasons: {
    branch: (branch: string, main: string) =>
      `this folder is on the branch "${branch}", not on ${main}`,
    changed: (count: string) =>
      `${count} file(s) in this folder were changed by hand and are not saved in git`,
    own: (count: string) =>
      `this folder has ${count} saved change(s) of its own that are not on GitHub`,
    overwrite:
      "files here that git does not keep would be overwritten by the new version",
    git: "git could not move this folder forward",
  },
};

type UpdatesWords = typeof en;

const it: UpdatesWords = {
  changes: (count) =>
    `${String(count)} ${count === 1 ? "modifica" : "modifiche"}`,
  more: (count) => `e altre ${String(count)}`,
  taking: "Prendo la nuova versione da GitHub…",
  restartNote: "I prodotti in funzione ripartono con essa.",
  blockedTitle: (changes) =>
    `Nuova versione su GitHub (${changes}), ma questa cartella non può ancora prenderla`,
  blockedText: (reason) =>
    `Non è cambiato nulla, perché ${reason}. Salva o annulla quelle modifiche (o chiedi a Claude di mettere in ordine questa cartella), poi premi Guarda di nuovo.`,
  newTitle: (changes) => `Nuova versione su GitHub: ${changes}`,
  newText:
    "Aggiorna la prende subito; i prodotti in funzione ripartono con essa.",
  looking: "Guardo su GitHub…",
  looked: (time) => ` · controllato alle ${time}`,
  offline: (looked) => `GitHub non è raggiungibile${looked}`,
  updatedAt: (time) => ` · aggiornato alle ${time}`,
  upToDate: (looked, updated) => `Aggiornato con GitHub${looked}${updated}`,
  row: {
    updating: "Aggiornamento…",
    takingChanges: "Prendo le modifiche da GitHub",
    cantYet: "Non posso ancora aggiornare",
    ready: (count) =>
      `${String(count)} ${count === 1 ? "modifica pronta" : "modifiche pronte"}`,
    release: (version) => `È uscito Kobble ${version}`,
    preparing: (number) => `In preparazione in #${String(number)}`,
    prepare: "Prepara l'aggiornamento per il team",
    updated: "Aggiornato",
    updatedText: (changes) => `${changes}, tutto è ripartito`,
  },
  release: {
    out: (version) => `È uscito Kobble ${version}`,
    beingPrepared:
      "Il costruttore prepara l'aggiornamento sulla bacheca. Quando la sua pull request è unita, ogni computer lo prende con il prossimo aggiornamento.",
    canPrepare:
      "Il costruttore può preparare l'aggiornamento come scheda: la nuova versione, le sue migrazioni e i controlli, come pull request da unire per il team.",
    openCard: (number) => `Apri #${String(number)}`,
    prepare: "Prepara l'aggiornamento",
  },
  lookAgain: "Guarda di nuovo",
  updateNow: "Aggiorna ora",
  update: "Aggiorna",
  byItself: "Aggiorna da solo",
  desktop: {
    say: "Apri la fabbrica con un doppio clic dalla scrivania.",
    put: (file) => `Messo sulla scrivania: ${file}`,
    button: "Metti un avvio sulla scrivania",
  },
  steps: {
    install: "Installo quello che serve alle modifiche",
    factory: "Riavvio la fabbrica con il nuovo Kobble",
    products: "Riavvio i prodotti",
  },
  reasons: {
    branch: (branch, main) =>
      `questa cartella è sul ramo "${branch}", non su ${main}`,
    changed: (count) =>
      `${count} file in questa cartella sono stati cambiati a mano e non sono salvati in git`,
    own: (count) =>
      `questa cartella ha ${count} modifiche salvate sue che non sono su GitHub`,
    overwrite:
      "file che git non tiene verrebbero sovrascritti dalla nuova versione",
    git: "git non è riuscito a portare avanti questa cartella",
  },
};

const de: UpdatesWords = {
  changes: (count) =>
    `${String(count)} ${count === 1 ? "Änderung" : "Änderungen"}`,
  more: (count) => `und ${String(count)} weitere`,
  taking: "Hole die neue Version von GitHub…",
  restartNote: "Die laufenden Produkte starten damit neu.",
  blockedTitle: (changes) =>
    `Neue Version auf GitHub (${changes}), aber dieser Ordner kann sie noch nicht übernehmen`,
  blockedText: (reason) =>
    `Nichts wurde geändert, weil ${reason}. Speichere oder verwirf diese Änderungen (oder bitte Claude, den Ordner aufzuräumen), dann drücke Nochmal schauen.`,
  newTitle: (changes) => `Neue Version auf GitHub: ${changes}`,
  newText:
    "Aktualisieren übernimmt sie jetzt; die laufenden Produkte starten damit neu.",
  looking: "Schaue auf GitHub…",
  looked: (time) => ` · geschaut um ${time}`,
  offline: (looked) => `GitHub war nicht erreichbar${looked}`,
  updatedAt: (time) => ` · aktualisiert um ${time}`,
  upToDate: (looked, updated) => `Auf dem Stand von GitHub${looked}${updated}`,
  row: {
    updating: "Wird aktualisiert…",
    takingChanges: "Hole die Änderungen von GitHub",
    cantYet: "Kann noch nicht aktualisieren",
    ready: (count) =>
      `${String(count)} ${count === 1 ? "Änderung" : "Änderungen"} bereit`,
    release: (version) => `Kobble ${version} ist da`,
    preparing: (number) => `Wird in #${String(number)} vorbereitet`,
    prepare: "Das Update fürs Team vorbereiten",
    updated: "Aktualisiert",
    updatedText: (changes) => `${changes}, alles ist neu gestartet`,
  },
  release: {
    out: (version) => `Kobble ${version} ist da`,
    beingPrepared:
      "Der Baumeister bereitet das Update auf dem Board vor. Sobald sein Pull Request zusammengeführt ist, übernimmt jeder Computer es mit dem nächsten Update.",
    canPrepare:
      "Der Baumeister kann das Update als Karte vorbereiten: die neue Version, ihre Migrationen und die Prüfungen, als Pull Request, den das Team zusammenführt.",
    openCard: (number) => `#${String(number)} öffnen`,
    prepare: "Update vorbereiten",
  },
  lookAgain: "Nochmal schauen",
  updateNow: "Jetzt aktualisieren",
  update: "Aktualisieren",
  byItself: "Von selbst aktualisieren",
  desktop: {
    say: "Öffne die Fabrik mit einem Doppelklick vom Schreibtisch.",
    put: (file) => `Auf den Schreibtisch gelegt: ${file}`,
    button: "Einen Start auf den Schreibtisch legen",
  },
  steps: {
    install: "Installiere, was die Änderungen brauchen",
    factory: "Starte die Fabrik mit dem neuen Kobble neu",
    products: "Starte die Produkte neu",
  },
  reasons: {
    branch: (branch, main) =>
      `dieser Ordner auf dem Branch „${branch}" ist, nicht auf ${main}`,
    changed: (count) =>
      `${count} Datei(en) in diesem Ordner von Hand geändert und nicht in git gespeichert sind`,
    own: (count) =>
      `dieser Ordner ${count} eigene gespeicherte Änderung(en) hat, die nicht auf GitHub sind`,
    overwrite:
      "Dateien, die git nicht verwaltet, von der neuen Version überschrieben würden",
    git: "git diesen Ordner nicht weiterbringen konnte",
  },
};

export const updates = area(en, it, de);
