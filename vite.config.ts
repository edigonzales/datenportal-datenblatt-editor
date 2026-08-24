import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

function normalizeBasePath(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  return withLeadingSlash.replace(/\/+$/, "") + "/";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(env.VITE_BASE_PATH);

  return {
    base: basePath,
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/app-icon-192.svg", "icons/app-icon-512.svg"],
        manifest: {
          name: "Datenblatt Editor",
          short_name: "Datenblatt",
          description: "Lokaler Metadateneditor fuer einen Datensatz",
          theme_color: "#d33833",
          background_color: "#f5f6f8",
          display: "standalone",
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: basePath + "icons/app-icon-192.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable"
            },
            {
              src: basePath + "icons/app-icon-512.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,json,xml,xtf,png,woff2}"],
          navigateFallback: basePath + "index.html"
        }
      })
    ],
    test: {
      environment: "jsdom",
      setupFiles: "./vitest.setup.ts",
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
      coverage: {
        provider: "v8"
      }
    }
  };
});
