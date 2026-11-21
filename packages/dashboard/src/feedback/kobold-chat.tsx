// The feedback side of Sprocket's window (sprocket-window.tsx). The post
// builds itself in a card pinned at the top while the person talks; below
// it, the kobold's short lines type in after a moment of thinking, with
// quick replies that change at each step. After Send the card becomes the
// post's live state. The script is in tell-kobold.ts. The new words are in
// English only for now. The parts are in their own files; this is where the
// window takes them from.

export { Chips, Thinking } from "./chips";
export { Feed } from "./feed";
export { LiveCard } from "./live-card";
export { SimilarAsYouType } from "./similar-posts";
