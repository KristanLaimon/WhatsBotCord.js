import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  // == Js Checking ==
  js.configs.recommended,
  // == Typescript Checking ==
  tseslint.configs.strict,
  globalIgnores(["build/", "node_modules/"]),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      semi: "error",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      eqeqeq: ["error", "always"],
      "no-extra-bind": "error",
      quotes: ["error", "double"], // or "single"
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }], // enforce Foo[] over Array<Foo>
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },
]);
