import { GetPath } from '../libs/BunPath';
import type { WAMessage } from "baileys";
import fs from "fs";

const messagesMocksPath = GetPath("src", "helpers", "Msg.helper.mocks.json");
if (!fs.existsSync(messagesMocksPath)) {
  throw new Error(`DEVELOPMENT ERROR: Json file with whatsapp mock msgs coudn't be found. Provide the correct path to this file in 'Msg.helper.mocks.ts' file!`)
}
const mockMsgs: WAMessage[] = JSON.parse(fs.readFileSync(GetPath("src", "helpers", "./Msg.helper.mocks.json"), "utf-8"));
if (!Array.isArray(mockMsgs)) {
  throw new Error(`DEVELOPMENT ERROR: Json file with whatsapp mock msgs FOUND, but it's not an array of expected msgs for some reason... check that`);
}

export const txtMessage: WAMessage = mockMsgs[0]!;
export const quotedMsg: WAMessage = mockMsgs[1]!;
export const stickerMsg: WAMessage = mockMsgs[2]!;
export const imageWithCaptionMsg: WAMessage = mockMsgs[3]!;
export const imageNoCaptionMsg: WAMessage = mockMsgs[4]!;
export const audioMsg: WAMessage = mockMsgs[5]!;
export const videoNoCaptionMsg: WAMessage = mockMsgs[6]!;
export const videoWithCaptionMsg: WAMessage = mockMsgs[7]!;
export const pollMultipleAnswerMsg: WAMessage = mockMsgs[8]!;
export const pollSingleAnswerMsg: WAMessage = mockMsgs[9]!;
export const locationMsg: WAMessage = mockMsgs[10]!;
export const contactMsg: WAMessage = mockMsgs[11]!;

export const txtMsgs = [txtMessage, quotedMsg, imageWithCaptionMsg, videoWithCaptionMsg];
export const noTxtMsgs = mockMsgs.filter(msg => !txtMsgs.includes(msg));