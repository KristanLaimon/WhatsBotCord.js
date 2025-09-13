import type { WAMessage } from "baileys";
import { WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";

//TODO: Export these types
/**
 * Enum representing group sending modes.
 */
export enum WhatsappIdType {
  /** Legacy group addressing mode (`pn`) */
  Legacy = "pn",
  /** Modern group addressing mode (`lid`) */
  Modern = "lid",
}

export type WhatsappIDInfo = {
  /**
   * The original WhatsApp ID as assigned by WhatsApp.
   * This is the raw identifier you receive in messages, without any formatting.
   */
  rawId?: string;

  /**
   * The phone number formatted for mentions in messages.
   * This is the normalized WhatsApp ID prefixed with '@', ready to be used in quotes or mentions.
   *
   * Example:
   * ```ts
   * // If the rawId is '1234567890@s.whatsapp.net', asMentionFormatted will be '@1234567890'
   * ```
   *
   * Note: When sending a message through the socket, make sure to include the sender's full raw ID in the array if required.
   */
  asMentionFormatted?: string;

  /**
   * Indicates the type of WhatsApp ID received.
   * - "lid": The ID comes from a group message as a linked device identifier. Messages cannot be sent directly to a `@lid`.
   * - "full": The ID comes from a private chat and is a full WhatsApp ID (e.g., '1234567890@s.whatsapp.net'), which can be used to send messages directly.
   */
  WhatsappIdType?: WhatsappIdType;
};

/**
 * Extracts detailed phone number information from a raw WhatsApp message.
 *
 * @param rawMsg - The raw WhatsApp message from which to extract the phone number.
 * @returns An object containing the phone number details, including country code,
 *          full number, number without country code, and WhatsApp ID.
 *
 * @throws {Error} If the phone number is invalid or both participant and remoteJid are undefined.
 *
 * @example
 * const rawMsg = { key: { participant: '1234567890123@s.whatsapp.net' } };
 * const phoneInfo = Phone_GetFullPhoneInfoFromRawmsg(rawMsg);
 */
export function WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(rawMsg: WAMessage): WhatsappIDInfo {
  //Let's check if comes from private msg or group
  const id: string | null = rawMsg.key.participant || rawMsg.key.remoteJid || null;
  if (!id) {
    throw Error("This shouldn't happen, baileys library never gives both participant and remoteJid as undefined, only one of them");
  }
  return WhatsappHelper_ExtractWhatsappIdFromWhatsappRawId(id);
}

export function WhatsappHelper_ExtractWhatsappIdFromWhatsappRawId(whatsappIDStr: string): WhatsappIDInfo {
  const idNumbersOnly = whatsappIDStr.split("@").at(0)!;
  let whatsIdType: WhatsappIdType;
  if (WhatsappHelper_isLIDIdentifier(whatsappIDStr)) {
    whatsIdType = WhatsappIdType.Modern;
  } else if (WhatsappHelper_isFullWhatsappIdUser(whatsappIDStr)) {
    whatsIdType = WhatsappIdType.Legacy;
  } else {
    throw new Error("WhatsappHelper_ExtractWhatsappIdFromSender couldn't get rawMsgs type id. Got instead: " + whatsappIDStr);
  }
  return {
    asMentionFormatted: `@${idNumbersOnly}`,
    rawId: whatsappIDStr,
    WhatsappIdType: whatsIdType,
  };
}

export function WhatsappHelper_ExtractWhatsappInfoFromMention(mentionId: string): WhatsappIDInfo | null {
  if (!WhatsappHelper_isMentionId(mentionId)) return null;
  const number = mentionId.slice(1);
  return {
    rawId: `${number}${WhatsappLIDIdentifier}`,
    asMentionFormatted: mentionId,
    WhatsappIdType: WhatsappIdType.Modern,
  };
}

export function WhatsappHelper_isLIDIdentifier(whatsIdExpected: string): boolean {
  const isLidRegex = new RegExp(`^\\d{11,16}${WhatsappLIDIdentifier}$`);
  return isLidRegex.test(whatsIdExpected);
}

/**
 * Checks if the given string is a valid mention ID for a WhatsApp user.
 *
 * @example
 * const isValid = WhatsappHelper_isMentionId('@1234567890123');
 *
 * @param numberStr - The string to check.
 * @returns true if the string is a valid mention ID for a WhatsApp user, false otherwise.
 */
export function WhatsappHelper_isMentionId(numberStr: string): boolean {
  const UserMentionedRegex = /^@\d{11,16}$/;
  return UserMentionedRegex.test(numberStr);
}

/**
 * Checks if the given string is a valid full WhatsApp ID for an individual user (e.g., '1234567890@s.whatsapp.net').
 *
 * @param expectedWhatsappId - The string to check.
 * @returns true if the string is a valid full WhatsApp ID for an individual user, false otherwise.
 * @example
 * const isValid = WhatsappHelper_isFullWhatsappIdUser('1234567890@s.whatsapp.net');
 */
export function WhatsappHelper_isFullWhatsappIdUser(expectedWhatsappId: string): boolean {
  const UserCompleteWhatsappIdRegex = new RegExp(`^\\d{11,16}${WhatsappIndividualIdentifier}$`);
  return UserCompleteWhatsappIdRegex.test(expectedWhatsappId);
}
