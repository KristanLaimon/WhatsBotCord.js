import type { WAMessage } from "baileys";
import { WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../Whatsapp.types.js";

/**
 * # WhatsApp ID Type
 *
 * Enum representing WhatsApp identifier conventions.
 *
 * @example
 * ```typescript
 * const myType = WhatsappIdType.Modern;
 * ```
 */
export enum WhatsappIdType {
  /** Legacy group addressing mode (`pn`) */
  Legacy = "pn",
  /** Modern group addressing mode (`lid`) */
  Modern = "lid",
}

/**
 * # WhatsApp ID Information
 *
 * Structure detailing different formats of a WhatsApp ID.
 *
 * @example
 * ```typescript
 * const info: WhatsappIDInfo = {
 *   rawId: "1234567890@s.whatsapp.net",
 *   asMentionFormatted: "@1234567890",
 *   WhatsappIdType: WhatsappIdType.Legacy
 * };
 * ```
 */
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
 * # Extract Phone Info From Sender Message
 *
 * Extracts detailed phone number information from a raw WhatsApp message.
 *
 * @param rawMsg - The raw WhatsApp message.
 * @returns An object containing the extracted WhatsApp ID details.
 * @throws {Error} If both participant and remoteJid are undefined.
 *
 * @example
 * ```typescript
 * const phoneInfo = WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(rawMsg);
 * console.log("Sender Mention string:", phoneInfo.asMentionFormatted);
 * ```
 */
export function WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg(rawMsg: WAMessage): WhatsappIDInfo {
  //Let's check if comes from private msg or group
  const id: string | null = rawMsg.key.participant || rawMsg.key.remoteJid || null;
  if (!id) {
    throw Error("This shouldn't happen, baileys library never gives both participant and remoteJid as undefined, only one of them");
  }
  return WhatsappHelper_ExtractFromWhatsappID(id);
}

/**
 * # Extract Info From WhatsApp ID
 *
 * Parses a given raw WhatsApp ID string into an informational structure.
 *
 * @param whatsappIDStr - The raw string identifier (e.g. "1234@s.whatsapp.net").
 * @returns The assembled `WhatsappIDInfo` data structure.
 *
 * @example
 * ```typescript
 * const info = WhatsappHelper_ExtractFromWhatsappID("123@s.whatsapp.net");
 * ```
 */
export function WhatsappHelper_ExtractFromWhatsappID(whatsappIDStr: string): WhatsappIDInfo {
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

/**
 * # Extract WhatsApp Info From Mention
 *
 * Gets the WhatsApp identifier details out of a mention string if valid.
 *
 * @param mentionId - A localized mention string (e.g., "@12345").
 * @returns The `WhatsappIDInfo` or `null` if invalid.
 *
 * @example
 * ```typescript
 * const info = WhatsappHelper_ExtractWhatsappInfoFromMention("@12345");
 * ```
 */
export function WhatsappHelper_ExtractWhatsappInfoFromMention(mentionId: string): WhatsappIDInfo | null {
  if (!WhatsappHelper_isMentionId(mentionId)) return null;
  const number = mentionId.slice(1);
  return {
    rawId: `${number}${WhatsappLIDIdentifier}`,
    asMentionFormatted: mentionId,
    WhatsappIdType: WhatsappIdType.Modern,
  };
}

/**
 * # Is LID Identifier
 *
 * Checks if a string acts as a modern Linked Device Identifier.
 *
 * @param whatsIdExpected - The raw ID string.
 * @returns True if it is a LID.
 *
 * @example
 * ```typescript
 * const isLid = WhatsappHelper_isLIDIdentifier("1234@lid");
 * ```
 */
export function WhatsappHelper_isLIDIdentifier(whatsIdExpected: string): boolean {
  const isLidRegex = new RegExp(`^\\d{11,16}${WhatsappLIDIdentifier}$`);
  return isLidRegex.test(whatsIdExpected);
}

/**
 * # Is Mention Identifier
 *
 * Checks if the given string is a valid mention ID for a WhatsApp user.
 *
 * @param numberStr - The mention formatted string to check.
 * @returns True if valid, false otherwise.
 *
 * @example
 * ```typescript
 * const isValid = WhatsappHelper_isMentionId('@1234567890123');
 * ```
 */
export function WhatsappHelper_isMentionId(numberStr: string): boolean {
  const UserMentionedRegex = /^@\d{11,16}$/;
  return UserMentionedRegex.test(numberStr);
}

/**
 * # Is Full WhatsApp User ID
 *
 * Checks if the given string is a valid full WhatsApp ID for an individual user.
 *
 * @param expectedWhatsappId - The string to check.
 * @returns True if the string is a standard individual user ID.
 *
 * @example
 * ```typescript
 * const isValid = WhatsappHelper_isFullWhatsappIdUser('1234567890@s.whatsapp.net');
 * ```
 */
export function WhatsappHelper_isFullWhatsappIdUser(expectedWhatsappId: string): boolean {
  const UserCompleteWhatsappIdRegex = new RegExp(`^\\d{11,16}${WhatsappPhoneNumberIdentifier}$`);
  return UserCompleteWhatsappIdRegex.test(expectedWhatsappId);
}
