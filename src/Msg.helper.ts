import { proto, type WAMessage } from "baileys";
import { MsgType } from './Msg.types';

export function MsgHelper_GetTextFrom(rawMsg: WAMessage): string | null {
  if (!rawMsg.message) return "There's no text in that message";
  return rawMsg.message.conversation || rawMsg.message.extendedTextMessage?.text || null;
}

/**
 * Gets the text content from a quoted message in a WAMessage.
 * @param quotedMsg The quoted message object from a WAMessage.
 * @returns The text content of the quoted message, or a default message if no
 */
export function MsgHelper_GetTextFromQuotedMsg(quotedMsg: proto.IMessage): string | null {
  return quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || null;
}

/**
 * Extracts the text from a quoted message if includes one inside a WAMesage
 * @param rawMsg 
 * @returns 
 */
export function MsgHelper_GetQuotedMsgTextFrom(rawMsg: WAMessage): string | null {
  if (!rawMsg.message || !rawMsg.message.extendedTextMessage || !rawMsg.message.extendedTextMessage.contextInfo || !rawMsg.message.extendedTextMessage.contextInfo.quotedMessage)
    return null;
  const quotedMsg = rawMsg.message.extendedTextMessage.contextInfo.quotedMessage;
  const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || null;
  return text;
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
