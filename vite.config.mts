import "dotenv/config";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 2828 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ srcDirectory: "app" }),
    nitro({
      compressPublicAssets: true,
      serverDir: "./server",
      routeRules: { "/api/status": { cache: { maxAge: 30, swr: true } } },
    }),
    viteReact(),
  ],
});
