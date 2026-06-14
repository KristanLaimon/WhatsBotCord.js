import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "whatsbotcord-browser-lib": "src-frontend/index.ts",
  },
  outDir: "dist-frontend",
  format: ["esm"],
  target: "esnext",
  platform: "browser",
  dts: true,
  clean: true,
  minify: true,
  bundle: true,
  treeshake: true,
});
