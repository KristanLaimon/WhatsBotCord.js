import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "!src/**/*.test.ts",
    "!src/**/*.mock.ts",
    "!src/core/whats_socket/mocks/*/**",
    "!src/mocks/*/**",
    "!docs/examples/*/**",
    "!src/index.main.ts",
    "!src/index.main.test.ts",
  ],
  dts: true,
  exports: true,
  outputOptions: {
    exports: "named",
  },
  sourcemap: true,
  clean: true,
  platform: "node",
  name: "Whatsbotcord",
  format: {
    esm: {
      target: ["es2024"],
    },
    cjs: {
      target: ["node20"],
    },
  },
});
