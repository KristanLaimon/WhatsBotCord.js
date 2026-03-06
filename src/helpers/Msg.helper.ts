import { type WAMessage, type proto } from "baileys";
import { MsgType, SenderType } from "../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../Whatsapp.types.js";
import type { FoundQuotedMsg } from "../core/bot/internals/CommandsSearcher.types.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";

/**
 * # Extract Full Message Text
 *
 * Extracts the textual content from a raw WhatsApp message.
 *
 * This function inspects a `WAMessage` object and returns the main text associated with it.
 * It supports multiple message types, including simple text, extended text, and media captions.
 * If the message has no text content, it returns `null`.
 *
 * @param rawMsg - The raw message object received from Baileys.
 * @returns The text content of the message, or `null` if none is found.
 *
 * @example
 * ```typescript
 * const text = MsgHelper_FullMsg_GetText(rawMsg);
 * if (text) {
 *   console.log("Message text:", text);
 * }
 * ```
 */
export function MsgHelper_FullMsg_GetText(rawMsg: WAMessage): string | null {
  if (!rawMsg.message) return null;
  return (
    rawMsg.message.conversation ??
    rawMsg.message.extendedTextMessage?.text ??
    rawMsg.message.imageMessage?.caption ??
    rawMsg.message.videoMessage?.caption ??
    null
  );
}

/**
 * # Extract Quoted Message Text
 *
 * Extracts the text from a quoted message if it includes one inside a WAMessage.
 *
 * @param rawMsg - The raw message containing the quote.
 * @returns The extracted quoted text or `null` if it doesn't exist.
 *
 * @example
 * ```typescript
 * const quotedText = MsgHelper_FullMsg_GetQuotedMsgText(rawMsg);
 * console.log(quotedText);
 * ```
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

/**
 * # Extract Text From Quoted Message Object
 *
 * Extracts text content directly from a quoted message prototype object.
 *
 * @param quotedMsgOnly - The proto message object representing the quote.
 * @returns The text representation of the quoted message.
 *
 * @example
 * ```typescript
 * const quotedProto = MsgHelper_FullMsg_GetQuotedMsg(rawMsg);
 * if (quotedProto) {
 *   const text = MsgHelper_QuotedMsg_GetText(quotedProto);
 * }
 * ```
 */
export function MsgHelper_QuotedMsg_GetText(quotedMsgOnly: proto.IMessage): string | null {
  return quotedMsgOnly.extendedTextMessage?.text ?? null;
}

// export function MsgHelper_HasQuotedMsg(rawMsg: WAMessage): boolean {
//   return !!rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
// }

/**
 * # Get Quoted Message Object
 *
 * Safely extracts the quoted message prototype object from a full WhatsApp message.
 *
 * @param rawMsg - The raw WhatsApp message that might contain a quote.
 * @returns The quoted message protocol object or `null` if not found.
 *
 * @example
 * ```typescript
 * const quotedProto = MsgHelper_FullMsg_GetQuotedMsg(rawMsg);
 * ```
 */
export function MsgHelper_FullMsg_GetQuotedMsg(rawMsg: WAMessage): proto.IMessage | null {
  return rawMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage ?? null;
}

/**
 * # Extract Quoted Message Information
 *
 * Returns both the quoted message object itself and its determined message type.
 *
 * @param rawMsg - The full WhatsApp message object.
 * @returns An object containing the quoted message and its type, or `null`.
 *
 * @example
 * ```typescript
 * const info = MsgHelper_ExtractQuotedMsgInfo(rawMsg);
 * if (info) {
 *   console.log("Quoted message type:", info.type);
 * }
 * ```
 */
export function MsgHelper_ExtractQuotedMsgInfo(rawMsg: WAMessage): FoundQuotedMsg | null {
  const existsQuotedMsg: proto.IMessage | null = MsgHelper_FullMsg_GetQuotedMsg(rawMsg);
  let quotedMsgAsArgument: FoundQuotedMsg | null = null;
  if (existsQuotedMsg) {
    const quotedMsgType: MsgType = MsgHelper_ProtoMsg_GetMsgType(existsQuotedMsg);
    quotedMsgAsArgument = {
      msg: existsQuotedMsg,
      type: quotedMsgType,
    };
  }
  return quotedMsgAsArgument;
}

/**
 * # Get Message Type
 *
 * Determines the type of a WhatsApp message from a raw Baileys `WAMessage` object.
 *
 * This function inspects the `message` field of the raw message and returns
 * a `MsgType` representing its type. If empty or unrecognized, returns `MsgType.Unknown`.
 *
 * @param rawMsg - The raw message object received from Baileys.
 * @returns The detected message type (`MsgType` enum).
 *
 * @example
 * ```typescript
 * const msgType = MsgHelper_FullMsg_GetMsgType(rawMsg);
 * if (msgType === MsgType.Text) {
 *   console.log("Received a text message.");
 * }
 * ```
 */
export function MsgHelper_FullMsg_GetMsgType(rawMsg: WhatsappMessage): MsgType {
  if (!rawMsg.message) return MsgType.Unknown;
  const objMsg = rawMsg.message;
  return MsgHelper_ProtoMsg_GetMsgType(objMsg);
}

/**
 * # Get Sender Type
 *
 * Detects whether the sender chat of the message is a group or an individual.
 *
 * @param rawMsg - The received WhatsApp message object.
 * @returns A `SenderType` indicating if it comes from a Group or Individual.
 *
 * @example
 * ```typescript
 * const senderType = MsgHelper_FullMsg_GetSenderType(rawMsg);
 * if (senderType === SenderType.Group) {
 *   console.log("Message is from a group chat.");
 * }
 * ```
 */
export function MsgHelper_FullMsg_GetSenderType(rawMsg: WhatsappMessage): SenderType {
  const chatId: string = rawMsg.key.remoteJid || rawMsg.key.remoteJidAlt!;
  let senderType: SenderType = SenderType.Unknown;
  if (chatId && chatId.endsWith(WhatsappGroupIdentifier)) senderType = SenderType.Group;
  if (chatId && chatId.endsWith(WhatsappPhoneNumberIdentifier)) senderType = SenderType.Individual;
  if (chatId && chatId.endsWith(WhatsappLIDIdentifier)) senderType = SenderType.Individual;
  return senderType;
}

/**
 * # Parse Prototype Message Type
 *
 * Gets the type of the message from the pure protocol message object.
 *
 * @param generic - The `IMessage` object from Baileys representing message content.
 * @returns The determined type of the message as a `MsgType` enum.
 *
 * @example
 * ```typescript
 * const msgType = MsgHelper_ProtoMsg_GetMsgType(rawMsg.message);
 * ```
 */
export function MsgHelper_ProtoMsg_GetMsgType(generic: proto.IMessage): MsgType {
  if (generic.imageMessage) return MsgType.Image;
  if (generic.videoMessage) return MsgType.Video;
  if (generic.audioMessage) return MsgType.Audio;
  if (generic.stickerMessage) return MsgType.Sticker;
  if (generic.pollCreationMessageV3) return MsgType.Poll;
  if (generic.locationMessage) return MsgType.Ubication;
  if (generic.contactMessage) return MsgType.Contact;
  if (generic.contactsArrayMessage) return MsgType.Contact;
  if (generic.documentMessage) return MsgType.Document;
  if (typeof generic.conversation === "string" || typeof generic.extendedTextMessage === "string" || generic.conversation || generic.extendedTextMessage)
    return MsgType.Text;
  return MsgType.Unknown;
}
