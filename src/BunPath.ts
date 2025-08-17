import path from "node:path";
import { isCompiled } from "./Envs";

export function GetPath(...filePathToAppendFromRoot: string[]): string {
  if (filePathToAppendFromRoot.length === 0)
    return "";

  if (isCompiled) {
    return path.join(process.cwd(), ...filePathToAppendFromRoot);
  } else {
    return path.join(...filePathToAppendFromRoot);
  }
}