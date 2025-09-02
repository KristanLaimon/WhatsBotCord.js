import { type WAMessage } from "baileys";
import type { MsgType, SenderType } from "src/Msg.types";

export type CommandArgs = {
  originalContent: WAMessage,
  userId?: string,
  chatId: string,
  senderType: SenderType,
  msgType: MsgType,
  args: string[],
  quotedMsg?: FoundQuotedMsg,
}

export type FoundQuotedMsg = {
  msg: WAMessage,
  type: MsgType,
  userIdItComesFrom: string
}