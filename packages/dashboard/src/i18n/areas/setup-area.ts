// Setting up Kobble in every language; each language in its own file, as
// the words are many.

import { area } from "../define.ts";
import { setupGerman } from "./setup-de.ts";
import { setupItalian } from "./setup-it.ts";
import { setupEnglish } from "./setup.ts";

export const setup = area(setupEnglish, setupItalian, setupGerman);
