// Piper voices the library does not list itself (it only knows a copy of
// Piper's collection), by where they are in Piper's own collection on
// Hugging Face. The library asks for a voice at HF_BASE/<path>, so the path
// steps up out of its copy (…/diffusionstudio/piper-voices/resolve/main).
// Serena, the Italian voice that sounds most natural.

const PIPER = "../../../../rhasspy/piper-voices/resolve/main";

export const MORE_VOICES: Record<string, string> = {
  "it_IT-serena-medium": `${PIPER}/it/it_IT/serena/medium/it_IT-serena-medium.onnx`,
};
