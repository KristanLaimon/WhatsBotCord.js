import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "whatsbotcord-browser-lib": "src-frontend/index.ts",
    "whatsbotcord-browser-lib.testing": "src-frontend/testing.ts",
    "whatsbotcord-browser-lib.helpers": "src-frontend/helpers.ts",
    "whatsbotcord-browser-lib.types": "src-frontend/types.ts",
    "whatsbotcord-browser-lib.debugging": "src-frontend/debugging.ts",
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
