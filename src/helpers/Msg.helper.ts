import { type WAMessage, type proto } from "baileys";
import { MsgType, SenderType } from "../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../Whatsapp.types.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";

/**
 * Extracts the textual content from a raw WhatsApp message.
 *
 * This function inspects a `WAMessage` object and returns the main text associated with it.
 * It supports multiple message types, including:
 * - Simple text messages (`conversation`)
 * - Extended text messages (`extendedTextMessage.text`)
 * - Image messages with captions (`imageMessage.caption`)
 * - Video messages with captions (`videoMessage.caption`)
 *
 * If the message has no text content, it returns `null`.
 *
 * @param rawMsg - The raw message object received from Baileys.
 * @returns The text content of the message, or `null` if none is found.
 *
 * @example
 * const text = MsgHelper_GetTextFrom(rawMsg);
 * if (text) {
 *   console.log("Message text:", text);
 * }
 *
 * @example
 * // Handling cases where no text exists
 * const text = MsgHelper_GetTextFrom(imageOnlyMsg);
 * if (!text) {
 *   console.log("This message has no text content.");
 * }
 */
export function MsgHelper_FullMsg_GetText(rawMsg: WAMessage): string | null {
  if (!rawMsg.message) return null;
  return (
    rawMsg.message.conversation ||
    rawMsg.message.extendedTextMessage?.text ||
    rawMsg.message.imageMessage?.caption ||
    rawMsg.message.videoMessage?.caption ||
    null
  );
}

/**
 * Extracts the text from a quoted message if includes one inside a WAMesage
 * @param rawMsg
 * @returns
 */
export function MsgHelper_FullMsg_GetQuotedMsgText(rawMsg: WhatsappMessage): string | null {
  if (
    !rawMsg.message ||
    !rawMsg.message.extendedTextMessage ||
    !rawMsg.message.extendedTextMessage.contextInfo ||
    !rawMsg.message.extendedTextMessage.contextInfo.quotedMessage
  )
    return null;
  const quotedMsg = rawMsg.message.extendedTextMessage.contextInfo.quotedMessage;
  const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || null;
  return text;
}

export function MsgHelper_QuotedMsg_GetText(quotedMsgOnly: proto.IMessage): string | null {
  return quotedMsgOnly.extendedTextMessage?.text ?? null;
}

// export function MsgHelper_HasQuotedMsg(rawMsg: WAMessage): boolean {
//   return !!rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
// }

export function MsgHelper_FullMsg_GetQuotedMsg(rawMsg: WAMessage): proto.IMessage | null {
  return rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage ?? null;
}

/**
 * Determines the type of a WhatsApp message from a raw Baileys `WAMessage` object.
 *
 * This function inspects the `message` field of the raw message and returns
 * a `MsgType` representing its type, such as `"text"`, `"image"`, `"audio"`, etc.
 * If the message object is empty or unrecognized, it returns `MsgType.Unknown`.
 *
 * @param rawMsg - The raw message object received from Baileys.
 * @returns The detected message type (`MsgType` enum).
 *
 * @example
 * const msgType = MsgHelper_GetMsgTypeFromRawMsg(rawMsg);
 * if (msgType === MsgType.Text) {
 *   console.log("Received a text message!");
 * }
 */
export function MsgHelper_FullMsg_GetMsgType(rawMsg: WhatsappMessage): MsgType {
  if (!rawMsg.message) return MsgType.Unknown;
  const objMsg = rawMsg.message;
  return MsgHelper_ProtoMsg_GetMsgType(objMsg);
}

export function MsgHelper_FullMsg_GetSenderType(rawMsg: WhatsappMessage): SenderType {
  const chatId: string = rawMsg.key.remoteJid!;
  let senderType: SenderType = SenderType.Unknown;
  if (chatId && chatId.endsWith(WhatsappGroupIdentifier)) senderType = SenderType.Group;
  if (chatId && chatId.endsWith(WhatsappIndividualIdentifier)) senderType = SenderType.Individual;
  return senderType;
}

/**
 * Gets the type of the message from the raw message object. (Private function inside this file)
 * @param generic It's a IMessage type object but can't be imported from baileys library for some reason...
 * @returns The type of the message as MsgType enum
 * @private
 */
export function MsgHelper_ProtoMsg_GetMsgType(generic: proto.IMessage): MsgType {
  if (generic.imageMessage) return MsgType.Image;
  if (generic.videoMessage) return MsgType.Video;
  if (generic.audioMessage) return MsgType.Audio;
  if (generic.stickerMessage) return MsgType.Sticker;
  if (generic.pollCreationMessageV3) return MsgType.Poll;
  if (generic.locationMessage) return MsgType.Ubication;
  if (generic.contactMessage) return MsgType.Contact;
  if (generic.documentMessage) return MsgType.Document;
  if (generic.conversation || generic.extendedTextMessage) return MsgType.Text;
  return MsgType.Unknown;
}
