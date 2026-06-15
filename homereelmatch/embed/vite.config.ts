import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/widget.ts"),
      name: "HomeReelMatch",
      fileName: "embed",
      formats: ["iife"],
    },
    outDir: path.resolve(__dirname, "dist"),
    rollupOptions: {
      output: {
        // 依存ライブラリなし — Vanilla TS のみ
        inlineDynamicImports: true,
      },
    },
    target: "es2018",
    minify: "terser",
  },
});
