// Talking to a kobold: the line under the voice, its problems, the orb.

import { area } from "../define.ts";

const en = {
  problems: {
    unsupported:
      "This browser has no graphics card support (WebGPU), so the speech model can't run here. Open the factory in an up-to-date Chrome or Edge.",
    stalled:
      "Getting ready has been stuck for 30 seconds with nothing happening. Check the internet connection, then try again.",
    blocked:
      "The browser is not allowed to use the microphone. Click the icon at the left of the address bar, allow the microphone, then press Talk again.",
    "no-microphone":
      "No microphone found. Plug one in or connect your headset, then press Talk again.",
    "microphone-busy":
      "The microphone is in use by another program. Close it (a call, a recorder), then press Talk again.",
    "microphone-failed":
      "The microphone opened, but its sound couldn't be read. Reload the page and press Talk again.",
    download:
      "The speech model couldn't be downloaded. Check the internet connection, then try again.",
    "voice-failed":
      "The coach's voice couldn't be played, so you won't hear its answers. Check that your speakers or headphones are on, then press Talk again.",
    "not-sent": "Your words couldn't be sent. Please say them again.",
  },
  noVoice: (language: string) =>
    `There's no ${language} voice in this browser, so the answers can't be read out. Add one in the computer's speech settings, or choose another language.`,
  loading: (model: string, percent: string) =>
    `Getting ready, don't talk yet: loading the ${model} speech model… ${percent}`,
  downloading: (
    model: string,
    percent: string,
    loaded: string,
    total: string,
  ) =>
    `Downloading the ${model} speech model, only the first time: ${percent} (${loaded} of ${total} MB)`,
  preparing: "Getting ready, don't talk yet: loading the speech model…",
  writing: "Writing down what you said…",
  listening: "Listening. Go ahead.",
  thinking: "Got it. Working on it…",
  speaking: "Speaking… say “stop” to interrupt.",
  quietly: "A short sound is being written down quietly.",
  orb: {
    preparing: "Getting ready…",
    listening: "Listening",
    writing: "Writing it down…",
    thinking: "Thinking…",
    speaking: "Speaking",
  },
  yourVoice: "Your voice",
  beingHeard: "Being heard",
  youSpeak: "The language you speak",
  gettingModel: "Getting the speech model",
  tryAgain: "Try again",
  close: "Close",
  endCall: "End call",
};

export const voice = area(
  en,
  {
    problems: {
      unsupported:
        "Questo browser non supporta la scheda grafica (WebGPU), quindi il modello vocale non può funzionare qui. Apri la fabbrica in un Chrome o Edge aggiornato.",
      stalled:
        "La preparazione è ferma da 30 secondi senza che succeda niente. Controlla la connessione a internet, poi riprova.",
      blocked:
        "Il browser non ha il permesso di usare il microfono. Clicca l'icona a sinistra della barra degli indirizzi, consenti il microfono, poi premi di nuovo Parla.",
      "no-microphone":
        "Nessun microfono trovato. Collegane uno o collega le cuffie, poi premi di nuovo Parla.",
      "microphone-busy":
        "Il microfono è usato da un altro programma. Chiudilo (una chiamata, un registratore), poi premi di nuovo Parla.",
      "microphone-failed":
        "Il microfono si è aperto, ma il suo suono non si è potuto leggere. Ricarica la pagina e premi di nuovo Parla.",
      download:
        "Non sono riuscito a scaricare il modello vocale. Controlla la connessione a internet, poi riprova.",
      "voice-failed":
        "La voce del coach non si è potuta riprodurre, quindi non sentirai le sue risposte. Controlla che altoparlanti o cuffie siano accesi, poi premi di nuovo Parla.",
      "not-sent": "Le tue parole non sono partite. Ripetile, per favore.",
    },
    noVoice: (language) =>
      `In questo browser non c'è una voce in ${language}, quindi le risposte non possono essere lette ad alta voce. Aggiungine una nelle impostazioni vocali del computer, o scegli un'altra lingua.`,
    loading: (model, percent) =>
      `Mi preparo, non parlare ancora: carico il modello vocale ${model}… ${percent}`,
    downloading: (model, percent, loaded, total) =>
      `Scarico il modello vocale ${model}, solo la prima volta: ${percent} (${loaded} di ${total} MB)`,
    preparing: "Mi preparo, non parlare ancora: carico il modello vocale…",
    writing: "Scrivo quello che hai detto…",
    listening: "Ti ascolto. Vai pure.",
    thinking: "Ricevuto. Ci lavoro…",
    speaking: "Sto parlando… di' “stop” per interrompere.",
    quietly: "Un breve suono viene trascritto in silenzio.",
    orb: {
      preparing: "Mi preparo…",
      listening: "Ascolto",
      writing: "Lo scrivo…",
      thinking: "Ci penso…",
      speaking: "Parlo",
    },
    yourVoice: "La tua voce",
    beingHeard: "Quello che sento",
    youSpeak: "La lingua che parli",
    gettingModel: "Prendo il modello vocale",
    tryAgain: "Riprova",
    close: "Chiudi",
    endCall: "Termina la chiamata",
  },
  {
    problems: {
      unsupported:
        "Dieser Browser unterstützt die Grafikkarte nicht (WebGPU), deshalb kann das Sprachmodell hier nicht laufen. Öffne die Fabrik in einem aktuellen Chrome oder Edge.",
      stalled:
        "Die Vorbereitung hängt seit 30 Sekunden, ohne dass etwas passiert. Prüfe die Internetverbindung, dann versuch es nochmal.",
      blocked:
        "Der Browser darf das Mikrofon nicht benutzen. Klick auf das Symbol links in der Adressleiste, erlaube das Mikrofon, dann drück nochmal auf Sprechen.",
      "no-microphone":
        "Kein Mikrofon gefunden. Steck eins ein oder verbinde dein Headset, dann drück nochmal auf Sprechen.",
      "microphone-busy":
        "Das Mikrofon wird von einem anderen Programm benutzt. Schließ es (ein Anruf, ein Rekorder), dann drück nochmal auf Sprechen.",
      "microphone-failed":
        "Das Mikrofon ist offen, aber sein Ton konnte nicht gelesen werden. Lade die Seite neu und drück nochmal auf Sprechen.",
      download:
        "Das Sprachmodell konnte nicht heruntergeladen werden. Prüfe die Internetverbindung, dann versuch es nochmal.",
      "voice-failed":
        "Die Stimme des Coachs konnte nicht abgespielt werden, du hörst also seine Antworten nicht. Prüfe, ob Lautsprecher oder Kopfhörer an sind, dann drück nochmal auf Sprechen.",
      "not-sent":
        "Deine Worte konnten nicht gesendet werden. Sag sie bitte nochmal.",
    },
    noVoice: (language) =>
      `In diesem Browser gibt es keine Stimme für ${language}, deshalb können die Antworten nicht vorgelesen werden. Füge eine in den Spracheinstellungen des Computers hinzu, oder wähle eine andere Sprache.`,
    loading: (model, percent) =>
      `Bereite mich vor, sprich noch nicht: lade das Sprachmodell ${model}… ${percent}`,
    downloading: (model, percent, loaded, total) =>
      `Lade das Sprachmodell ${model} herunter, nur beim ersten Mal: ${percent} (${loaded} von ${total} MB)`,
    preparing: "Bereite mich vor, sprich noch nicht: lade das Sprachmodell…",
    writing: "Schreibe auf, was du gesagt hast…",
    listening: "Ich höre zu. Leg los.",
    thinking: "Verstanden. Ich arbeite daran…",
    speaking: 'Ich spreche… sag „stop", um zu unterbrechen.',
    quietly: "Ein kurzes Geräusch wird leise aufgeschrieben.",
    orb: {
      preparing: "Bereite mich vor…",
      listening: "Höre zu",
      writing: "Schreibe es auf…",
      thinking: "Denke nach…",
      speaking: "Spreche",
    },
    yourVoice: "Deine Stimme",
    beingHeard: "Was ich höre",
    youSpeak: "Die Sprache, die du sprichst",
    gettingModel: "Hole das Sprachmodell",
    tryAgain: "Nochmal versuchen",
    close: "Schließen",
    endCall: "Gespräch beenden",
  },
);
