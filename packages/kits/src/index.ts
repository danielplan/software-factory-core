// The kits that ship with the core: one per kind of product the factory
// knows how to recognise, start, check and make.

import type { Kit } from "@software-factory/core";

import { expoApp } from "./expo-app.ts";
import { nestjsBackend } from "./nestjs-backend.ts";
import { reactWebApp } from "./react-web-app.ts";

export { expoApp, nestjsBackend, reactWebApp };

// In the order they are asked to recognise a folder: the phone app before
// the web app, though each also refuses the other's kind.
export const allKits: Kit[] = [expoApp, reactWebApp, nestjsBackend];
