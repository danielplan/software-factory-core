import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The factory's server (packages/server) serves the build on
// http://localhost:4300. `npm run dev` serves the sources on 4301 and sends
// the data requests to a running server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "127.0.0.1",
    port: 4301,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:4300" },
  },
});
