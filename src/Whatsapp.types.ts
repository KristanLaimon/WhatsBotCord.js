/**
 * # WhatsApp Group Identifier
 *
 * Suffix identifier used by WhatsApp for group chats.
 *
 * @example
 * ```typescript
 * const isGroup = chatId.endsWith(WhatsappGroupIdentifier);
 * ```
 */
export const WhatsappGroupIdentifier: string = "@g.us";

/**
 * # WhatsApp Phone Number Identifier
 *
 * Suffix identifier used by WhatsApp for individual phone numbers.
 *
 * @example
 * ```typescript
 * const isIndividual = chatId.endsWith(WhatsappPhoneNumberIdentifier);
 * ```
 */
export const WhatsappPhoneNumberIdentifier: string = "@s.whatsapp.net";

/**
 * # WhatsApp LID Identifier
 *
 * Suffix identifier used by WhatsApp for LID-normalized IDs.
 *
 * @example
 * ```typescript
 * const isLID = chatId.endsWith(WhatsappLIDIdentifier);
 * ```
 */
export const WhatsappLIDIdentifier: string = "@lid";
