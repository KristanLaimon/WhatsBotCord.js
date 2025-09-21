import path from "node:path";

/**
 * Do not use this anymore, it's the same as using path.join.
 * @deprecated Do not use this anymore, it used to work as a compile/not-compile path management, but that doesn't have sense
 * in a library...
 */
export function GetPath(...filePathToAppendFromRoot: string[]): string {
  if (filePathToAppendFromRoot.length === 0) return "";
  return path.join(...filePathToAppendFromRoot);
}
