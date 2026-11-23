// Where a button on the board says why it did not work (the page shows it).

import { createContext } from "react";

export const BoardProblem = createContext<(problem: string | null) => void>(
  () => undefined,
);
