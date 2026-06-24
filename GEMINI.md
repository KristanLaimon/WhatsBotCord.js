# Specifics
1. All changes to do in /src, mirror them in /src-frontend (adapting to browser-friendly version)

# Project Overview: WhatsBotCord.js

## Project Purpose
**WhatsBotCord.js** is a lightweight, TypeScript-based library designed for building WhatsApp bots with a Discord-inspired command system (e.g., `!yourcommand`, `@everyone`). It serves as an intuitive wrapper around `Baileys.js`, abstracting complex internals to provide a type-safe and developer-friendly interface for managing WhatsApp groups and individual chats. It supports ESM and CommonJS, and is highly optimized (can be used with Bun).

## Architecture & Tech Stack
- **Language**: TypeScript
- **Core Dependency**: `baileys` (WhatsApp Web API wrapper)
- **Environment**: Node.js / Bun
- **Build System**: `tsdown`, `tsc` for type checking
- **Testing**: `bun test`
- **Linting & Formatting**: `eslint`, `prettier`

## Folder Structure
- `src/`: The core source code of the library.
  - `src/core/`: Core internal logic and abstraction layers over Baileys.js.
    - `src/core/bot/`: Main bot instance logic.
      - `src/core/bot/internals/`: Internal bot utilities.
    - `src/core/official_plugins/`: Built-in plugins for the bot.
    - `src/core/whats_socket/`: Socket implementation interacting with Baileys.
      - `src/core/whats_socket/internals/`: Internal implementations for the socket layer.
        - `src/core/whats_socket/internals/mock_data/`: Mock data resources for testing.
      - `src/core/whats_socket/mocks/`: Mocking utilities for the socket.
  - `src/helpers/`: Utility functions and helper modules.
  - `src/libs/`: External library integrations or standalone utilities.
  - `src/mocking_suite/`: Advanced mocking tools for library testing.
  - `src/mocks/`: Mock data and structures.
  - `src/index.ts` / `src/index.main.ts`: Main entry points for the library.
- `test/`: Test cases.
  - `test/folder/`: Directory for file testing (e.g. image, video, pdf testing).
- `docs/`: Documentation.
  - `docs/examples/`: Code examples of using the library.
  - `docs/updates/`: Documentation on library updates.
- `scripts/`: Custom scripts for build/deployment.
- `dist/`: Compiled build output (Ignored).
- `auth/` / `auth_canary/`: Used for storing Baileys authentication credentials (Ignored).

---

## Coding Guidelines & Refactoring Rules

- **YAGNI:** Proactively identify and remove unnecessary abstractions, premature optimizations, or unused features. Do not build for imaginary future use cases.
- **KISS & DRY:** Simplify logic. If you find yourself copying and pasting code, abstract it into a helper function or module.
- **Complexity Reduction:** Whenever making a code change or refactoring, always aim to reduce complexity. (Provide a before-and-after comparison or clearly explain the complexity reduction in PRs or AI suggestions).
- **Readability over Cleverness:** Ensure that every change keeps the code highly readable, explicit, and easy for a junior developer to understand. Overly clever one-liners or cryptic syntax are **forbidden** if they sacrifice clarity.

### Naming Conventions
- **Folders:** Use `snake_case` (e.g., `mocking_suite`, `official_plugins`, `whats_socket`).
- **Files:** Use `PascalCase` with domain and role suffixes.
  - Examples: `Msg.helper.ts`, `Msg.types.ts`, `Decorators.helper.ts`, `Envs.ts`.
  - Test files must be collocated with their target file using `.test.ts` (e.g., `Msg.helper.test.ts`).
- **Functions:** Use `PascalCase` with an underscore `_` separating the domain and action.
  - Example: `MsgHelper_FullMsg_GetText`, `MsgHelper_ProtoMsg_GetMsgType`.
- **Classes, Enums, Types, and Interfaces:** Use `PascalCase` (e.g., `WhatsBotOptions`, `MsgType`, `SenderType`). Interfaces typically start with an `I` (e.g., `IWhatsSocket`, `IChatContext`).
- **Variables & Parameters:** Use `camelCase` (e.g., `rawMsg`, `quotedMsgOnly`, `existsQuotedMsg`).

### TypeScript & Module System
- **ES Modules:** Use native ESM import/export syntax (e.g., `import { MsgType } from "../Msg.types.js";`). **Always include the `.js` extension** in relative path imports, which is standard for TS ESM resolution.
- **Type Imports:** Consistently separate type imports using the `type` keyword (`import type { ... }`). Enforced by `@typescript-eslint/consistent-type-imports`.
- **Array Typings:** Always use `Type[]` instead of `Array<Type>`. Enforced by `@typescript-eslint/array-type`.
- **Strict Mode:** TypeScript `strict` mode is enabled. Adhere to strong typings.
- **Tolerated Types:** `@typescript-eslint/no-explicit-any` and `no-non-null-assertion` are turned `off`. Use them judiciously when interacting with complex internal structures (like Baileys proto objects), but avoid them in public APIs.

### Linting & Formatting
Our code is formatted automatically via Prettier and linted via ESLint. Respect these configurations:
- **Quotes:** Always use double quotes (`"`) for strings. Single quotes (`'`) are **forbidden** by ESLint.
- **Semicolons:** Always terminate statements with semicolons (`;`). Enforced by ESLint and Prettier.
- **Equality:** Always use strict equality (`===` and `!==`). Abstract equality (`==` and `!=`) is **forbidden**.
- **Print Width & Tabs:** Print width is set to 160 characters. Tab width is 2 spaces (no tabs).
- **Trailing Commas:** Set to `es5` mode in Prettier.

### Documentation & Comments (JSDoc)
We heavily rely on structured JSDoc comments to fuel our developer experience. Follow this pattern for public exports (functions, classes, interfaces):
1. **Header:** Start the description with a markdown header (e.g., `* # Title`).
2. **Description:** Clearly explain what the code does, its purpose, and edge cases.
3. **Tags:** Use standard tags like `@param` and `@returns`.
4. **Examples:** Provide an `@example` tag featuring a markdown code block (` ```typescript `) to show how it's used.

**Example of an ideal JSDoc block:**
```typescript
/**
 * # Extract Full Message Text
 *
 * Extracts the textual content from a raw WhatsApp message.
 * Supports multiple message types, including simple text and media captions.
 *
 * @param rawMsg - The raw message object received from Baileys.
 * @returns The text content of the message, or `null` if none is found.
 *
 * @example
 * \`\`\`typescript
 * const text = MsgHelper_FullMsg_GetText(rawMsg);
 * if (text) {
 *   console.log("Message text:", text);
 * }
 * \`\`\`
 */
export function MsgHelper_FullMsg_GetText(rawMsg: WAMessage): string | null {
  // ...
}
```

### Forbidden / Rare Practices
- **Forbidden:** Overly complex or "clever" one-liners.
- **Forbidden:** Ignoring strict equality (`==` / `!=`).
- **Forbidden:** Omitting semicolons or using single quotes for generic strings.
- **Forbidden:** Building for future "potential" features (Violates YAGNI).
- **Rare:** Putting test files in a completely disjoint directory (except for general E2E or mock suites). Unit tests should live alongside the file they test.
- **Rare:** Using `Array<T>`. Always prefer `T[]`.

### Testing Style
We strictly use the `bun:test` runner.
- **Test Runner & Framework:** Use imports directly from `bun:test` (`describe`, `test`, `it`, `expect`, `spyOn`, `mock`). Do not use Jest or Vitest.
- **Collocation:** Test files must live right next to the file they are testing (e.g., `bot.ts` -> `bot.test.ts`).
- **Naming Convention (Crucial):** Tests must be named using a strict, descriptive condition-action format without spaces, typically using PascalCase or camelCase with underscores.
  - *Pattern:* `[Category/Context]_When[Condition]_Should[ExpectedOutcome]`
  - *Example:* `test("Running_WhenRunningSimple_NORMALCOMMAND_FROMGROUP_ShouldSuccessfully", () => { ... })`
  - *Example:* `it("WhenGivenAValidTxtMessage_ShouldExtractTextMsg", () => { ... })`
- **Mocking & Dependency Injection:** Use dedicated files in a `src/mocks` directory to store heavy mock data (like dummy WhatsApp messages) and import them. Within complex test files, encapsulate standard initialization and dependency injection logic inside a local `toolkit()` function to keep test setups clean.
