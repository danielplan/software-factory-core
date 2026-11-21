// Sending feedback to the people who make the factory, in every language;
// each language in its own file, as the words are many: the row in the
// sidebar, the notice when the factory hits an error, and Sprocket's chat
// (feedback/).

import { area } from "../define.ts";
import { feedbackGerman } from "./feedback-de.ts";
import { feedbackEnglish } from "./feedback-en.ts";
import { feedbackItalian } from "./feedback-it.ts";

export const feedback = area(feedbackEnglish, feedbackItalian, feedbackGerman);
