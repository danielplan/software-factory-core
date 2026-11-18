import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// The new tool is served at the top of its address ("/") until its build
// decides where it lives. In development, /api goes to the backend named in
// .env (BACKEND_URL), when there is one.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.BACKEND_URL;
  return {
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      ...(backend && {
        proxy: { "/api": { target: backend, changeOrigin: true } },
      }),
    },
  };
});
