// The Marketplace: the extensions, the connections and the product kits, in
// every language; each language in its own file, as the words are many.

import { area } from "../define.ts";
import { marketGerman } from "./market-de.ts";
import { marketEnglish } from "./market-en.ts";
import { marketItalian } from "./market-it.ts";

export const market = area(marketEnglish, marketItalian, marketGerman);
