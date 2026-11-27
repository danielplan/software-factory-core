// The words, in the three languages, as i18next reads them: one JSON file
// per area and language (locales/<language>/<area>.json), all in one
// namespace with the area as the first part of each key ("shell.pages.home").
// Add an area here once its files are written.

import builderEn from "./locales/en/builder.json" with { type: "json" };
import chatEn from "./locales/en/chat.json" with { type: "json" };
import connectEn from "./locales/en/connect.json" with { type: "json" };
import exploreEn from "./locales/en/explore.json" with { type: "json" };
import factoryEn from "./locales/en/factory.json" with { type: "json" };
import feedbackEn from "./locales/en/feedback.json" with { type: "json" };
import homeEn from "./locales/en/home.json" with { type: "json" };
import marketEn from "./locales/en/market.json" with { type: "json" };
import personasEn from "./locales/en/personas.json" with { type: "json" };
import releasesEn from "./locales/en/releases.json" with { type: "json" };
import settingsEn from "./locales/en/settings.json" with { type: "json" };
import setupEn from "./locales/en/setup.json" with { type: "json" };
import shellEn from "./locales/en/shell.json" with { type: "json" };
import signalsEn from "./locales/en/signals.json" with { type: "json" };
import supportEn from "./locales/en/support.json" with { type: "json" };
import systemEn from "./locales/en/system.json" with { type: "json" };
import testingEn from "./locales/en/testing.json" with { type: "json" };
import updatesEn from "./locales/en/updates.json" with { type: "json" };
import voiceEn from "./locales/en/voice.json" with { type: "json" };
import whatsNewEn from "./locales/en/whatsNew.json" with { type: "json" };
import wordsEn from "./locales/en/words.json" with { type: "json" };
import builderIt from "./locales/it/builder.json" with { type: "json" };
import chatIt from "./locales/it/chat.json" with { type: "json" };
import connectIt from "./locales/it/connect.json" with { type: "json" };
import exploreIt from "./locales/it/explore.json" with { type: "json" };
import factoryIt from "./locales/it/factory.json" with { type: "json" };
import feedbackIt from "./locales/it/feedback.json" with { type: "json" };
import homeIt from "./locales/it/home.json" with { type: "json" };
import marketIt from "./locales/it/market.json" with { type: "json" };
import personasIt from "./locales/it/personas.json" with { type: "json" };
import releasesIt from "./locales/it/releases.json" with { type: "json" };
import settingsIt from "./locales/it/settings.json" with { type: "json" };
import setupIt from "./locales/it/setup.json" with { type: "json" };
import shellIt from "./locales/it/shell.json" with { type: "json" };
import signalsIt from "./locales/it/signals.json" with { type: "json" };
import supportIt from "./locales/it/support.json" with { type: "json" };
import systemIt from "./locales/it/system.json" with { type: "json" };
import testingIt from "./locales/it/testing.json" with { type: "json" };
import updatesIt from "./locales/it/updates.json" with { type: "json" };
import voiceIt from "./locales/it/voice.json" with { type: "json" };
import whatsNewIt from "./locales/it/whatsNew.json" with { type: "json" };
import wordsIt from "./locales/it/words.json" with { type: "json" };
import builderDe from "./locales/de/builder.json" with { type: "json" };
import chatDe from "./locales/de/chat.json" with { type: "json" };
import connectDe from "./locales/de/connect.json" with { type: "json" };
import exploreDe from "./locales/de/explore.json" with { type: "json" };
import factoryDe from "./locales/de/factory.json" with { type: "json" };
import feedbackDe from "./locales/de/feedback.json" with { type: "json" };
import homeDe from "./locales/de/home.json" with { type: "json" };
import marketDe from "./locales/de/market.json" with { type: "json" };
import personasDe from "./locales/de/personas.json" with { type: "json" };
import releasesDe from "./locales/de/releases.json" with { type: "json" };
import settingsDe from "./locales/de/settings.json" with { type: "json" };
import setupDe from "./locales/de/setup.json" with { type: "json" };
import shellDe from "./locales/de/shell.json" with { type: "json" };
import signalsDe from "./locales/de/signals.json" with { type: "json" };
import supportDe from "./locales/de/support.json" with { type: "json" };
import systemDe from "./locales/de/system.json" with { type: "json" };
import testingDe from "./locales/de/testing.json" with { type: "json" };
import updatesDe from "./locales/de/updates.json" with { type: "json" };
import voiceDe from "./locales/de/voice.json" with { type: "json" };
import whatsNewDe from "./locales/de/whatsNew.json" with { type: "json" };
import wordsDe from "./locales/de/words.json" with { type: "json" };

const en = {
  builder: builderEn,
  chat: chatEn,
  connect: connectEn,
  explore: exploreEn,
  factory: factoryEn,
  feedback: feedbackEn,
  home: homeEn,
  market: marketEn,
  personas: personasEn,
  releases: releasesEn,
  settings: settingsEn,
  setup: setupEn,
  shell: shellEn,
  signals: signalsEn,
  support: supportEn,
  system: systemEn,
  testing: testingEn,
  updates: updatesEn,
  voice: voiceEn,
  whatsNew: whatsNewEn,
  words: wordsEn,
};
const it = {
  builder: builderIt,
  chat: chatIt,
  connect: connectIt,
  explore: exploreIt,
  factory: factoryIt,
  feedback: feedbackIt,
  home: homeIt,
  market: marketIt,
  personas: personasIt,
  releases: releasesIt,
  settings: settingsIt,
  setup: setupIt,
  shell: shellIt,
  signals: signalsIt,
  support: supportIt,
  system: systemIt,
  testing: testingIt,
  updates: updatesIt,
  voice: voiceIt,
  whatsNew: whatsNewIt,
  words: wordsIt,
};
const de = {
  builder: builderDe,
  chat: chatDe,
  connect: connectDe,
  explore: exploreDe,
  factory: factoryDe,
  feedback: feedbackDe,
  home: homeDe,
  market: marketDe,
  personas: personasDe,
  releases: releasesDe,
  settings: settingsDe,
  setup: setupDe,
  shell: shellDe,
  signals: signalsDe,
  support: supportDe,
  system: systemDe,
  testing: testingDe,
  updates: updatesDe,
  voice: voiceDe,
  whatsNew: whatsNewDe,
  words: wordsDe,
};

export const resources = {
  en: { translation: en },
  // The other languages have every key English has (test/i18n.test.ts).
  it: { translation: it },
  de: { translation: de },
};
