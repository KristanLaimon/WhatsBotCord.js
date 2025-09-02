import { WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "src/Whatsapp.types";
import type { WAMessage } from "baileys";

export type WhatsappsenderIDType = "lid" | "full";

export type WhatsappIDInfo = {
  /**
   * The original WhatsApp ID as assigned by WhatsApp.
   * This is the raw identifier you receive in messages, without any formatting.
   */
  rawId: string;

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
  asMentionFormatted: string;

  /**
   * Indicates the type of WhatsApp ID received.
   * - "lid": The ID comes from a group message as a linked device identifier. Messages cannot be sent directly to a `@lid`.
   * - "full": The ID comes from a private chat and is a full WhatsApp ID (e.g., '1234567890@s.whatsapp.net'), which can be used to send messages directly.
   */
  WhatsappIdType: WhatsappsenderIDType;
}

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
export function WhatsappHelper_ExtractWhatsappIdInfoFromSenderRawMsg(rawMsg: WAMessage): WhatsappIDInfo {
  //Let's check if comes from private msg or group
  const id: string | null = rawMsg.key.participant || rawMsg.key.remoteJid || null;
  if (!id) {
    throw Error("This shouldn't happen, baileys library never gives both participant and remoteJid as undefined, only one of them");
  }
  const idNumbersOnly = id.split("@").at(0)!;
  let whatsIdType: WhatsappsenderIDType;
  if (WhatsappHelper_isLIDIdentifier(id)) {
    whatsIdType = "lid";
  } else if (WhatsappHelper_isFullWhatsappIdUser(id)) {
    whatsIdType = "full";
  } else {
    throw new Error("WhatsappHelper_ExtractWhatsappIdFromSender couldn't get rawMsgs type id. Got insted: " + id);
  }
  return {
    asMentionFormatted: `@${idNumbersOnly}`,
    rawId: id,
    WhatsappIdType: whatsIdType
  };
}

export function WhatsappHelper_ExtractWhatsappIdFromMention(mentionId: string): WhatsappIDInfo | null {
  if (!WhatsappHelper_isMentionId(mentionId)) return null;
  const number = mentionId.slice(1);
  return {
    rawId: `${number}${WhatsappLIDIdentifier}`,
    asMentionFormatted: mentionId,
    WhatsappIdType: "lid"
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
function WhatsappHelper_isFullWhatsappIdUser(expectedWhatsappId: string): boolean {
  const UserCompleteWhatsappIdRegex = new RegExp(`^\\d{11,16}${WhatsappIndividualIdentifier}$`);
  return UserCompleteWhatsappIdRegex.test(expectedWhatsappId);
}
