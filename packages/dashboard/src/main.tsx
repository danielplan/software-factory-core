import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app";
import "./index.css";

// The company's theme (the server's /theme.css, empty without one), last,
// so its variables win over the factory's own.
const theme = document.createElement("link");
theme.rel = "stylesheet";
theme.href = "/theme.css";
document.head.append(theme);

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no element with the id root.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
