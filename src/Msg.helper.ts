import { proto, type WAMessage } from "baileys";
import { MsgType } from './Msg.types';

export function MsgHelper_GetTextFromRawMsg(rawMsg: WAMessage): string {
  if (!rawMsg.message) return "There's no text in that message";
  return rawMsg.message.conversation || rawMsg.message.extendedTextMessage?.text || "========== NO TEXT MSG =============";
}

export function MsgHelper_GetTextFromQuotedMsg(quotedMsg: proto.IMessage) {
  return quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || "There's no text in that message";
}

export function MsgHelper_GetMsgTypeFromRawMsg(rawMsg: WAMessage): MsgType {
  if (!rawMsg.message) return MsgType.Unknown;
  const objMsg = rawMsg.message;
  return _getTypeOfMsg(objMsg);
}
/**
 * Gets the type of the message from the raw message object. (Private function inside this file)
 * @param generic It's a IMessage type object but can't be imported from baileys library for some reason...
 * @returns The type of the message as MsgType enum
 * @private
 */
function _getTypeOfMsg(generic: any): MsgType {
  if (generic.imageMessage) return MsgType.Image;
  if (generic.videoMessage) return MsgType.Video;
  if (generic.audioMessage) return MsgType.Audio;
  if (generic.stickerMessage) return MsgType.Sticker;
  if (generic.conversation || generic.extendedTextMessage) return MsgType.Text;
  return MsgType.Unknown
}
