import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "generateSW", filename: "sw.js", manifest: false,
      injectRegister: null, registerType: "autoUpdate", devOptions: { enabled: false },
      includeAssets: ["fonts/*"],
      workbox: {
        cacheId: "uwazi-compass-kiosk", cleanupOutdatedCaches: true,
        skipWaiting: true, clientsClaim: true,
        globPatterns: ["**/*.{js,css,png,svg,woff,woff2,ttf,otf}", "index.html"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: undefined,
        runtimeCaching: [{
          urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && /^\/compass\/(demo|persona)\//.test(url.pathname),
          handler: "NetworkFirst",
          options: { cacheName: "uwazi-compass-kiosk-pages", networkTimeoutSeconds: 3, expiration: { maxEntries: 30, maxAgeSeconds: 7 * 86400 }, precacheFallback: { fallbackURL: "index.html" } },
        }, {
          urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.*-[\w-]+\.(js|css|png|svg|woff2?)$/.test(url.pathname),
          handler: "CacheFirst", options: { cacheName: "uwazi-compass-kiosk-assets", expiration: { maxEntries: 150, maxAgeSeconds: 7 * 86400 } },
        }],
      },
    }),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    target: "es2015",
  },
}));
