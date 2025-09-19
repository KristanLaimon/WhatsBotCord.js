import type { WhatsappMessage } from "../core/whats_socket/types.js";

/**
 * Internal helper for building the minimal base structure of a mock
 * WhatsApp message object.
 *
 * This function provides a consistent "skeleton" message with common
 * fields prefilled (e.g., `key`, `timestamp`, `deviceListMetadata`),
 * which can then be extended with specific message types such as text,
 * images, or reactions.
 *
 * @param chatId - The unique identifier (JID) of the chat where the message belongs.
 * @param participantId - The JID of the participant who sends the message.
 * @param id - Unique identifier of the message (typically a UUID or hash).
 * @param timestamp - Unix timestamp in **seconds** when the message was created.
 * @param pushName - Display name of the sender, as it would appear in WhatsApp.
 * @returns A partially constructed {@link WhatsappMessage} with basic metadata.
 *
 * @internal
 */
function _createBaseMsg(chatId: string, participantId: string | null, id: string, timestamp: number, pushName: string): WhatsappMessage {
  return {
    key: {
      remoteJid: chatId,
      participant: participantId ?? undefined,
      fromMe: false,
      id: id,
    },
    messageTimestamp: timestamp,
    pushName: pushName,
    broadcast: false,
    message: {},
    deviceListMetadata: {
      senderKeyHash: "qprrpV5KV38MkA==",
      senderTimestamp: "1355194316",
      recipientKeyHash: "4gj7dwAGWE3rWw==",
      recipientTimestamp: "1155394318",
    },
    deviceListMetadataVersion: 2,
    //@ts-expect-error This is string, but ts thinks is other type for some reason
    messageSecret: "j+pPQKnytgjeJuMsvrly26TrQQjTFgDauhu2Gy9XsUM=",
  };
}

/**
 * Factory function to generate a mock **text message** object in the
 * shape expected from the WhatsApp WebSocket.
 *
 * This is useful for testing, simulations, or mocking incoming messages
 * without relying on actual network activity. It builds on top of
 * {@link _createBaseMsg} by injecting a `conversation` field that
 * contains the text.
 *
 * @example
 * ```ts
 * const mockMsg = MsgFactory_CreateText(
 *   "12345@s.whatsapp.net",     // chatId
 *   "1111@c.us",                // participantId
 *   "Hello world!",             // text
 *   { customSenderWhatsUsername: "Alice" }
 * );
 * ```
 *
 * @param chatId - The chat JID where the message should appear.
 * @param participantId - The JID of the sender (e.g., phone number with domain).
 * @param textToIncludeInMsg - The text body of the message (goes into `conversation`).
 * @param options - Optional configuration.
 * @param options.customSenderWhatsUsername - Override the sender's display name.
 *
 * @returns A complete {@link WhatsappMessage} object that represents a
 * mock text message, including metadata and content.
 */
export function MsgFactory_CreateText(
  chatId: string,
  participantId: string | undefined | null,
  textToIncludeInMsg: string,
  options?: { customSenderWhatsUsername?: string }
): WhatsappMessage {
  const timestamp = Math.floor(Date.now() / 1000);
  const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg (mock response)";

  const message: WhatsappMessage = _createBaseMsg(chatId, participantId ?? null, "5AD0EEC1D2649BF2A2EC614714B3ED11", timestamp, pushName);
  message.message = {
    conversation: textToIncludeInMsg,
  };
  return message;
}
