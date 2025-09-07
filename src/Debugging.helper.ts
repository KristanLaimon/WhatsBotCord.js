import fs from "node:fs";
import type { WhatsappMessage } from "./core/whats_socket/types";
import { GetPath } from "./libs/BunPath";

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
