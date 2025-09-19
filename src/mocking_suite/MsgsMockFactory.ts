import mime from "mime";
import path from "path";
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
function _createBaseMsg(chatId: string, participantId: string | null, id?: string, timestamp?: number, pushName?: string): WhatsappMessage {
  return {
    key: {
      remoteJid: chatId,
      participant: participantId ?? undefined,
      fromMe: false,
      id: id,
    },
    messageTimestamp: timestamp ?? Date.now(),
    pushName: pushName ?? "Mock user",
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

/**
 * Factory function to generate a mock **text message with a quoted reply**.
 *
 * Builds on {@link _createBaseMsg} and injects an `extendedTextMessage`
 * with `contextInfo` referencing another {@link WhatsappMessage}.
 *
 * @example
 * ```ts
 * const original = MsgFactory_Image("123@g.us", "111@s.whatsapp.net", "http://img.jpg");
 * const reply = MsgFactory_TextWithQuote("123@g.us", null, "Nice pic!", original);
 * ```
 *
 * @param chatId - Chat JID where the reply is sent.
 * @param participantId - JID of the sender of this reply.
 * @param text - The body of the reply message.
 * @param quoted - A previously generated {@link WhatsappMessage} that
 *                 will be referenced as the quoted content.
 * @param opts.pushName - Override the display name for the sender.
 *
 * @returns A {@link WhatsappMessage} simulating a text reply with a quoted message.
 */
export function MsgFactory_TextWithQuote(
  chatId: string,
  participantId: string | null,
  text: string,
  quoted: WhatsappMessage,
  opts?: { pushName?: string }
): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);

  base.message = {
    extendedTextMessage: {
      text,
      contextInfo: {
        stanzaId: quoted.key.id,
        participant: quoted.key.participant ?? quoted.key.remoteJid,
        quotedMessage: quoted.message,
      },
    },
  };

  return base;
}

/**
 * Factory function to generate a mock **image message**.
 *
 * @example
 * ```ts
 * const imgMsg = MsgFactory_Image("123@g.us", null, "http://server/image.jpg", {
 *   caption: "Check this out!"
 * });
 * ```
 *
 * @param chatId - Chat JID where the image is sent.
 * @param participantId - JID of the sender.
 * @param url - URL or path to the image.
 * @param opts.caption - Optional text caption.
 * @param opts.pushName - Override display name of sender.
 *
 * @returns A {@link WhatsappMessage} with an `imageMessage` payload.
 */
export function MsgFactory_Image(chatId: string, participantId: string | null, url: string, opts?: { caption?: string; pushName?: string }): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    imageMessage: {
      url,
      mimetype: mime.getExtension(path.extname(url)),
      caption: opts?.caption,
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **video message**.
 *
 * @example
 * ```ts
 * const vidMsg = MsgFactory_Video("123@g.us", "111@s.whatsapp.net", "http://vid.mp4", {
 *   caption: "Funny video"
 * });
 * ```
 *
 * @param chatId - Chat JID where the video is sent.
 * @param participantId - JID of the sender.
 * @param url - URL or path to the video.
 * @param opts.caption - Optional text caption.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `videoMessage` payload.
 */
export function MsgFactory_Video(chatId: string, participantId: string | null, url: string, opts?: { caption?: string; pushName?: string }): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    videoMessage: {
      url,
      mimetype: mime.getExtension(path.extname(url)),
      caption: opts?.caption,
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **audio message**.
 *
 * @example
 * ```ts
 * const audioMsg = MsgFactory_Audio("123@g.us", null, "http://server/audio.ogg");
 * ```
 *
 * @param chatId - Chat JID where the audio is sent.
 * @param participantId - JID of the sender.
 * @param url - URL or path to the audio file.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with an `audioMessage` payload.
 */
export function MsgFactory_Audio(chatId: string, participantId: string | null, url: string, opts?: { pushName?: string }): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    audioMessage: {
      url,
      mimetype: mime.getExtension(path.extname(url)),
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **sticker message**.
 *
 * @example
 * ```ts
 * const stickerMsg = MsgFactory_Sticker("123@g.us", null, "http://server/sticker.webp");
 * ```
 *
 * @param chatId - Chat JID where the sticker is sent.
 * @param participantId - JID of the sender.
 * @param url - URL or path to the `.webp` sticker file.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `stickerMessage` payload.
 */
export function MsgFactory_Sticker(chatId: string, participantId: string | null, url: string, opts?: { pushName?: string }): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    stickerMessage: {
      url,
      mimetype: "image/webp",
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **document message**.
 *
 * @example
 * ```ts
 * const docMsg = MsgFactory_Document("123@g.us", "111@s.whatsapp.net", "http://server/file.pdf", {
 *   fileName: "report.pdf"
 * });
 * ```
 *
 * @param chatId - Chat JID where the document is sent.
 * @param participantId - JID of the sender.
 * @param url - URL or path to the document file.
 * @param opts.fileName - File name shown in WhatsApp.
 * @param opts.mimetype - MIME type of the document.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `documentMessage` payload.
 */
export function MsgFactory_Document(
  chatId: string,
  participantId: string | null,
  url: string,
  opts?: { fileName?: string; mimetype?: string; pushName?: string }
): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    documentMessage: {
      url,
      mimetype: opts?.mimetype ?? "application/pdf",
      fileName: opts?.fileName ?? "mock.pdf",
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **contact message**.
 *
 * @example
 * ```ts
 * const vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:Alice\nTEL;type=CELL:+521234567890\nEND:VCARD";
 * const contactMsg = MsgFactory_Contact("123@g.us", null, "Alice", vcard);
 * ```
 *
 * @param chatId - Chat JID where the contact is sent.
 * @param participantId - JID of the sender.
 * @param displayName - Display name of the contact.
 * @param vcard - Raw vCard string representing the contact.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `contactMessage` payload.
 */
export function MsgFactory_Contact(
  chatId: string,
  participantId: string | null,
  displayName: string,
  vcard: string,
  opts?: { pushName?: string }
): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    contactMessage: {
      displayName,
      vcard,
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **location message**.
 *
 * @example
 * ```ts
 * const locMsg = MsgFactory_Location("123@g.us", "111@s.whatsapp.net", 19.4326, -99.1332, {
 *   name: "CDMX",
 *   address: "Zócalo"
 * });
 * ```
 *
 * @param chatId - Chat JID where the location is sent.
 * @param participantId - JID of the sender.
 * @param lat - Latitude in degrees.
 * @param lng - Longitude in degrees.
 * @param opts.name - Location name label.
 * @param opts.address - Location address label.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `locationMessage` payload.
 */
export function MsgFactory_Location(
  chatId: string,
  participantId: string | null,
  lat: number,
  lng: number,
  opts?: { name?: string; address?: string; pushName?: string }
): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);
  base.message = {
    locationMessage: {
      degreesLatitude: lat,
      degreesLongitude: lng,
      name: opts?.name,
      address: opts?.address,
    },
  };
  return base;
}

/**
 * Factory function to generate a mock **contacts array message**.
 * Automatically builds proper vCard strings from simple
 * `{ contactName, phoneNumber }` objects.
 *
 * @example
 * ```ts
 * const contactsMsg = MsgFactory_ContactsArray("123@g.us", null, [
 *   { contactName: "Alice", phoneNumber: "+521234567890" },
 *   { contactName: "Bob", phoneNumber: "+529876543210" }
 * ]);
 * ```
 *
 * @param chatId - Chat JID where the contacts array is sent.
 * @param participantId - JID of the sender.
 * @param contacts - Array of simple contact definitions
 *                   (`{ contactName, phoneNumber }`) to be converted to vCards.
 * @param opts.pushName - Override sender display name.
 *
 * @returns A {@link WhatsappMessage} with a `contactsArrayMessage` payload.
 */
export function MsgFactory_ContactsArray(
  chatId: string,
  participantId: string | null,
  contacts: Array<{ contactName: string; phoneNumber: string }>,
  opts?: { pushName?: string }
): WhatsappMessage {
  const base = _createBaseMsg(chatId, participantId, opts?.pushName);

  const converted = contacts.map(({ contactName, phoneNumber }) => {
    const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${contactName}`, `TEL;type=CELL:${phoneNumber}`, "END:VCARD"].join("\n");

    return { displayName: contactName, vcard };
  });

  base.message = {
    contactsArrayMessage: {
      contacts: converted,
    },
  };
  return base;
}
