import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), {
    name: "development-csp",
    apply: "serve",
    // React's local hot-reload preamble is inline. Every production build retains
    // the strict policy; only the development HTML transform removes it.
    transformIndexHtml(html) {
      return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "");
    },
  }],
  base: process.env.VITE_BASE_PATH || "/floridanomics-dashboard-mvp/",
  build: {
    manifest: true,
    // Do not modulepreload the Recharts chunk on the landing: it is only needed when a
    // chart tab opens, where the dynamic-import runtime fetches it on demand.
    modulePreload: {
      resolveDependencies: (_filename: string, deps: string[]) =>
        deps.filter((dep) => !dep.includes("recharts")),
    },
    rollupOptions: {
      output: {
        // Split heavy vendors so the chartless landing does not ship Recharts,
        // and so React + Recharts cache independently of app code across deploys.
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory")) {
              return "recharts";
            }
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
              return "react-vendor";
            }
          }
          return undefined;
        },
      },
    },
  },
}));
