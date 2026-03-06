/**
 * # Message Type
 *
 * Enumeration mapping the type of the message received.
 *
 * @example
 * ```typescript
 * const type = MsgType.Text;
 * ```
 */
export enum MsgType {
  Text = 1,
  Image,
  Sticker,
  Video,
  Audio,
  Contact,
  Poll,
  Ubication,
  Document,
  Unknown,
}

/**
 * # Sender Type
 *
 * Enumeration mapping the type of sender that sent the message.
 *
 * @example
 * ```typescript
 * const type = SenderType.Individual;
 * ```
 */
export enum SenderType {
  Group = 1,
  Individual,
  Unknown,
}
