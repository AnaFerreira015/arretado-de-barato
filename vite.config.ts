import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  // These variables remain in the server process, never in the client bundle.
  const env = loadEnv(mode, process.cwd(), "ECONOMIZA_");
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
  return {
    plugins: [tsconfigPaths(), tailwindcss(), tanstackStart({ server: { entry: "server" } }), nitro({ preset: "node-server" }), react()],
    resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router"] },
  };
});
