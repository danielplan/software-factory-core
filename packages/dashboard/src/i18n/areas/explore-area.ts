// Explorations in every language; each language in its own file, as the
// words are many.

import { area } from "../define.ts";
import { exploreGerman } from "./explore-de.ts";
import { exploreItalian } from "./explore-it.ts";
import { exploreEnglish } from "./explore.ts";

export const explore = area(exploreEnglish, exploreItalian, exploreGerman);
