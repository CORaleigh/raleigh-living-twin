import { defineConfig } from "vite";

// @arcgis/core loads its runtime assets (workers, wasm, styles) from the Esri
// CDN by default, so no asset-copy plugin is required for a first run.
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project site under /raleigh-living-twin/. Only the
  // production build needs that prefix; `vite dev` stays at the root.
  base: command === "build" ? "/raleigh-living-twin/" : "/",
  server: { port: 5173, open: true },
  build: { target: "es2020", chunkSizeWarningLimit: 4000 }
}));
