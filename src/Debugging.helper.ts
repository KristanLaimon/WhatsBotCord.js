import fs from "node:fs";
import type { WhatsappMessage } from "./core/whats_socket/types.js";
import { GetPath } from "./libs/BunPath.js";

/**
 * # Store Message in History JSON
 *
 * Stores the incoming WhatsApp message into a local JSON file for debugging purposes.
 * If the file does not exist, it creates it.
 *
 * @param filePath - The path to the JSON file where history will be stored.
 * @param rawMsg - The raw WhatsApp message object to store.
 *
 * @example
 * ```typescript
 * Debug_StoreWhatsMsgHistoryInJson("./debug_history.json", rawMsg);
 * ```
 */
export function Debug_StoreWhatsMsgHistoryInJson(filePath: string, rawMsg: WhatsappMessage) {
  let msgsStored: any[] = [];
  if (fs.existsSync(GetPath(filePath))) {
    const before = fs.readFileSync(GetPath(filePath), "utf-8");
    if (before.trim() === "") {
      msgsStored = [];
    } else {
      msgsStored = JSON.parse(before);
    }
  } else {
    //Creates the file if it doesn't exist
    fs.writeFileSync(GetPath(filePath), "", "utf-8");
    msgsStored = [];
  }
  msgsStored.push(rawMsg);
  const json = JSON.stringify(msgsStored, null, 2);
  fs.writeFileSync(GetPath(filePath), json, "utf-8");
}
