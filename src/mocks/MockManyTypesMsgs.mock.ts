import fs from "fs";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { GetPath } from "../libs/BunPath.js";

const messagesMocksPath = GetPath("src", "mocks", "Msg.helper.mocks.json");
if (!fs.existsSync(messagesMocksPath)) {
  throw new Error(
    "DEVELOPMENT ERROR: Json file with whatsapp mock msgs coudn't be found. Provide the correct path to this file in 'Msg.helper.mocks.ts' file!"
  );
}
export const allMockMsgs: WhatsappMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "mocks", "./Msg.helper.mocks.json"), "utf-8"));
if (!Array.isArray(allMockMsgs)) {
  throw new Error("DEVELOPMENT ERROR: Json file with whatsapp mock msgs FOUND, but it's not an array of expected msgs for some reason... check that");
}

export const txtMessage: WhatsappMessage = allMockMsgs[0]!;
export const quotedMsg: WhatsappMessage = allMockMsgs[1]!;
export const stickerMsg: WhatsappMessage = allMockMsgs[2]!;
export const imageWithCaptionMsg: WhatsappMessage = allMockMsgs[3]!;
export const imageNoCaptionMsg: WhatsappMessage = allMockMsgs[4]!;
export const audioMsg: WhatsappMessage = allMockMsgs[5]!;
export const videoNoCaptionMsg: WhatsappMessage = allMockMsgs[6]!;
export const videoWithCaptionMsg: WhatsappMessage = allMockMsgs[7]!;
export const pollMultipleAnswerMsg: WhatsappMessage = allMockMsgs[8]!;
export const pollSingleAnswerMsg: WhatsappMessage = allMockMsgs[9]!;
export const locationMsg: WhatsappMessage = allMockMsgs[10]!;
export const contactMsg: WhatsappMessage = allMockMsgs[11]!;

export const txtMsgs = [txtMessage, quotedMsg, imageWithCaptionMsg, videoWithCaptionMsg];
export const noTxtMsgs = allMockMsgs.filter((msg) => !txtMsgs.includes(msg));
