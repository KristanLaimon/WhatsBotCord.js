import type { WAMessage } from "baileys";
import fs from "fs";
import { GetPath } from "../libs/BunPath";

const messagesMocksPath = GetPath("src", "mocks", "Msg.helper.mocks.json");
if (!fs.existsSync(messagesMocksPath)) {
  throw new Error(
    "DEVELOPMENT ERROR: Json file with whatsapp mock msgs coudn't be found. Provide the correct path to this file in 'Msg.helper.mocks.ts' file!"
  );
}
export const allMockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "mocks", "./Msg.helper.mocks.json"), "utf-8"));
if (!Array.isArray(allMockMsgs)) {
  throw new Error("DEVELOPMENT ERROR: Json file with whatsapp mock msgs FOUND, but it's not an array of expected msgs for some reason... check that");
}

export const txtMessage: WAMessage = allMockMsgs[0]!;
export const quotedMsg: WAMessage = allMockMsgs[1]!;
export const stickerMsg: WAMessage = allMockMsgs[2]!;
export const imageWithCaptionMsg: WAMessage = allMockMsgs[3]!;
export const imageNoCaptionMsg: WAMessage = allMockMsgs[4]!;
export const audioMsg: WAMessage = allMockMsgs[5]!;
export const videoNoCaptionMsg: WAMessage = allMockMsgs[6]!;
export const videoWithCaptionMsg: WAMessage = allMockMsgs[7]!;
export const pollMultipleAnswerMsg: WAMessage = allMockMsgs[8]!;
export const pollSingleAnswerMsg: WAMessage = allMockMsgs[9]!;
export const locationMsg: WAMessage = allMockMsgs[10]!;
export const contactMsg: WAMessage = allMockMsgs[11]!;

export const txtMsgs = [txtMessage, quotedMsg, imageWithCaptionMsg, videoWithCaptionMsg];
export const noTxtMsgs = allMockMsgs.filter((msg) => !txtMsgs.includes(msg));
