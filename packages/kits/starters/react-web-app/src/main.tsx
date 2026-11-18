import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n/i18n";
import { App } from "./app/app";
import "./theme.css";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15000, refetchOnWindowFocus: true } },
});
// Prototype mode only (npm run prototype): the pretend backend starts in the
// browser before the app; when the shared world changes, the screens load
// their data again. The real build drops this branch and every file behind
// it.
if (import.meta.env.MODE === "prototype") {
  const { startPrototype } = await import("../prototype/start.ts");
  await startPrototype(() => void queryClient.invalidateQueries());
}
const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
