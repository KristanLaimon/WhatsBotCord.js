import dotenv from "dotenv";
dotenv.config({ path: "./.env.development", quiet: true });

/**
 * This file contains environment variables and flags that are used throughout
 * the project to determine the environment in which the code is running.
 *
 * EXPECTED ENVIRONMENT VARIABLES:
 * 1. ISDEVELOPMENT: "true" or "false"
 * 2. ISCOMPILED: "true" or "false" (if compiled with Bun will all paths will be relative to current working directory otherwise they will be relative to the project root)
 */

/**
 * # Is Dev
 *
 * This is used to determine if the code is running in development mode or production mode.
 *
 * @example
 * ```typescript
 * if (isDev) console.log("development");
 * ```
 */
export const isDev = process.env["whatsbotcord_ISDEVELOPMENT"] === "true";

/**
 * # Skip Long Tests
 *
 * Flag to skip long tests during execution.
 *
 * @example
 * ```typescript
 * if (skipLongTests) return;
 * ```
 */
export const skipLongTests: boolean = process.env["whatsbotcord_SKIP_LONG_TESTS"] === "true";
