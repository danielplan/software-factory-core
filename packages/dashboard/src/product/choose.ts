// Choosing a card on the Product map, from inside the card: React Flow
// draws the cards, so the page hands them this through a context.

import { createContext, useContext } from "react";

export const ChooseContext = createContext<(id: string) => void>(() => {});

export const useChoose = () => useContext(ChooseContext);
