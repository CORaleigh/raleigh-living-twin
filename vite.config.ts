import { defineConfig } from "vite";

// @arcgis/core loads its runtime assets (workers, wasm, styles) from the Esri
// CDN by default, so no asset-copy plugin is required for a first run.
export default defineConfig({
  server: { port: 5173, open: true },
  build: { target: "es2020", chunkSizeWarningLimit: 4000 }
});
