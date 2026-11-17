// The words the server sends in English for what comes with the core (its
// kits, its add-ons, the AI model setting), said in the dashboard's
// language, found by their id. Anything the dashboard does not know (an
// extension's kit, add-on or setting) keeps the server's words. Kept apart
// from the components so it is checked on its own.

import { t } from "../i18n/i18n.ts";

const KITS = [
  "expo-app",
  "nestjs-backend",
  "other-code",
  "react-web-app",
  "sveltekit-app",
  "typescript-package",
] as const;
const ADD_ONS = ["github", "jira"] as const;
const GROUPS = ["ai-model"] as const;
const FIELDS = ["FACTORY_CLAUDE_MODEL"] as const;

const isOne = <T extends string>(list: readonly T[], id: string): id is T =>
  (list as readonly string[]).includes(id);

type Named = { id: string; name: string; about: string };

export function kitWords<T extends Named>(kit: T): T {
  const { id } = kit;
  return isOne(KITS, id)
    ? {
        ...kit,
        name: t(`settings:known.kits.${id}.name`),
        about: t(`settings:known.kits.${id}.about`),
      }
    : kit;
}

export function addOnWords<T extends Named>(addOn: T): T {
  const { id } = addOn;
  return isOne(ADD_ONS, id)
    ? {
        ...addOn,
        name: t(`settings:known.addOns.${id}.name`),
        about: t(`settings:known.addOns.${id}.about`),
      }
    : addOn;
}

export function groupWords<T extends Named>(group: T): T {
  const { id } = group;
  return isOne(GROUPS, id)
    ? {
        ...group,
        name: t(`settings:known.groups.${id}.name`),
        about: t(`settings:known.groups.${id}.about`),
      }
    : group;
}

export function fieldWords<
  T extends { key: string; label: string; help: string },
>(field: T): T {
  const { key } = field;
  return isOne(FIELDS, key)
    ? {
        ...field,
        label: t(`settings:known.fields.${key}.label`),
        help: t(`settings:known.fields.${key}.help`),
      }
    : field;
}
