import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/app/app.tsx";

// Renders the whole app at an address, as main.tsx does.
export function renderApp(path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, staleTime: 15000 } },
  });
  const user = userEvent.setup({ delay: null });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user, client };
}
