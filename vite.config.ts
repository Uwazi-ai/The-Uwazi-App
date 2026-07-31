import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Injects a unique CACHE_VERSION into dist/sw.js after each production build
// so browsers always pick up the new service worker on deploy.
function injectSWVersion() {
  return {
    name: "inject-sw-version",
    apply: "build" as const,
    closeBundle() {
      const version = `uwazi-${Date.now()}`;
      const swPath = path.resolve(__dirname, "dist/sw.js");
      try {
        if (!existsSync(swPath)) {
          console.warn("⚠️  dist/sw.js not found — skipping SW version injection");
          return;
        }
        let swContent = readFileSync(swPath, "utf-8");
        swContent = swContent.replace(
          /const CACHE_VERSION = ['"`][^'"`]*['"`]/,
          `const CACHE_VERSION = '${version}'`,
        );
        writeFileSync(swPath, swContent);
        console.log(`✅ SW cache version injected: ${version}`);
      } catch (err) {
        console.warn("⚠️  Could not inject SW version:", err);
      }
    },
  };
}

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
    injectSWVersion(),
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
