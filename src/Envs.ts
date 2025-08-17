/**
 * This file contains environment variables and flags that are used throughout 
 * the project to determine the environment in which the code is running.
 * 
 * EXPECTED ENVIRONMENT VARIABLES:
 * 1. ISDEVELOPMENT: "true" or "false" 
 * 2. ISCOMPILED: "true" or "false" (if compiled with Bun will all paths will be relative to current working directory otherwise they will be relative to the project root)
 */

/** This is used to determine if the code is running in development mode or production mode. */
export const isDev = process.env["ISDEVELOPMENT"] === "true";

/** To know if this bot is being compiled using any tool compiler like "bun compile" and similar ones */
export const isCompiled = process.env["ISCOMPILED"] === "true";


