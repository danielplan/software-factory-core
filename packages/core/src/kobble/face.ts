// A persona's face: a kobold with a hat and a colour, so the team can tell
// personas apart at a glance. A persona file may say which; when it does
// not, one is worked out from the persona's id, so it never changes. The
// floppy cap is the kobold's own and is never a persona's.

export const PERSONA_HATS = ["phones", "toque", "cap", "beret"] as const;
export const PERSONA_COLORS = [
  "pink",
  "amber",
  "blue",
  "teal",
  "violet",
  "green",
  "slate",
] as const;

export type PersonaHat = (typeof PERSONA_HATS)[number];
export type PersonaColor = (typeof PERSONA_COLORS)[number];
export type Face = { hat: PersonaHat; color: PersonaColor };

// A small number from a text, always the same for the same text (FNV-1a).
function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// The face worked out from an id.
export function faceFor(id: string): Face {
  const hash = hashOf(id);
  return {
    hat: PERSONA_HATS[hash % PERSONA_HATS.length] ?? "cap",
    color:
      PERSONA_COLORS[
        Math.floor(hash / PERSONA_HATS.length) % PERSONA_COLORS.length
      ] ?? "blue",
  };
}

// The persona's own face, or the one from its id.
export function faceOf(persona: { id: string; face?: Face }): Face {
  return persona.face ?? faceFor(persona.id);
}
