import type { MiscMessageGenerationOptions, WAMessage } from "baileys";

export type WhatsMsgSenderSendingOptionsMINIMUM = {
  /**
   * If true, bypasses the safe anti-spam queue system and sends the message
   * immediately through the socket.
   *
   * Warning:
   *   - This may cause issues if too many messages are sent too quickly
   *   - Use only for critical cases where immediate delivery is required
   *   - Default: false (messages go through the queue)
   *
   * Use at your own risk!
   */
  sendRawWithoutEnqueue?: boolean;
  /**
   * An array of WhatsApp user IDs to mention in the message.
   *
   * In WhatsApp, to mention someone you:
   *   1. Include their phone number + WhatsApp ID (e.g., "234234567890@s.whatsapp.net") in this array.
   *   2. Use the same mention placeholder in the message content (e.g., "@234234567890").
   *
   * The socket library will replace the placeholders with proper mentions and notify the users.
   *
   * Example:
   * ```ts
   * socket.SendTxt("12345@g.us", "Hello '@234567890!'", { mentionsIds: ["234567890@s.whatsapp.net"] });
   * ```
   *
   * Default: undefined (no users mentioned)
   */
  mentionsIds?: string[];
} & MiscMessageGenerationOptions;

export type WhatsMsgSenderSendingOptions = WhatsMsgSenderSendingOptionsMINIMUM & {
  /**
   * If true, applies text normalization before sending the message.
   * Normalization ensures:
   *   - Trimming leading and trailing whitespace
   *   - Removing extra spaces at the start/end of each line
   *   - Preserving empty lines without extra whitespace
   *
   * Useful for cleaning up multi-line or user-generated strings
   * before sending them.
   *
   * Default: true (message text is normalized by default)
   */
  normalizeMessageText?: boolean;
} & MiscMessageGenerationOptions;

export type WhatsMsgMediaWithCaption = {
  /**
   * Optional text to include along with the image.
   *
   * - Appears as a caption below the image in WhatsApp
   * - Can be used for descriptions, notes, or additional context
   */
  caption?: string;
};

export type WhatsMsgMediaStringSource = {
  /**
   * Path to the source file to send.
   *
   * - Supports both relative and absolute paths
   * - For projects where this library is compiled/bundled,
   *   using absolute paths is recommended to avoid issues
   *   with build environments or working directories
   */
  source: string;
};

export type WhatsMsgMediaBufferSource = {
  /**
   * Path to the source file to send.
   *
   * - Supports both relative and absolute paths
   * - For projects where this library is compiled/bundled,
   *   using absolute paths is recommended to avoid issues
   *   with build environments or working directories
   */
  source: Buffer;
  /**
   * Mandatory file extension if using sourcePath buffer (without the leading ".") such as `"mp4"`, `"ogv"`, or `"avi"`.
   *
   * This value is used as a hint when inferring the document's MIME type.
   * While the MIME type is primarily detected from the file buffer,
   * some formats require the extension as additional metadata to resolve
   * correctly. If omitted, detection may fall back to
   * `"application/octet-stream"`.
   */
  formatExtension: string;
};

export type WhatsMsgMediaOptions = WhatsMsgMediaWithCaption & (WhatsMsgMediaStringSource | WhatsMsgMediaBufferSource);

export type WhatsMsgAudioOptions = WhatsMsgMediaStringSource | WhatsMsgMediaBufferSource;

export type WhatsMsgDocumentOptions =
  | (WhatsMsgMediaStringSource & { fileNameToDisplay?: string })
  | (WhatsMsgMediaBufferSource & { fileNameWithoutExtension: string });

export type WhatsMsgPollOptions = {
  withMultiSelect: boolean;
  normalizeTitleText?: boolean;
  normalizeOptionsText?: boolean;
};

export type WhatsMsgUbicationOptions = {
  degreesLatitude: number;
  degreesLongitude: number;
  name?: string;
  addressText?: string;
};

export interface IWhatsSocket_Submodule_SugarSender {
  /**
   * Sends a text message to the specified chat.
   *
   * @param chatId - The ID of the chat where the message will be sent.
   * @param text - The text message to be sent.
   * @param sanitizeText - A boolean indicating whether to sanitize the text or not. Defaults to true.
   * @param options - Miscellaneous message generation options.
   * @param mentionsIds - Array of IDs of users to mention in the message. The 'text' must contain '@' characters in the same order as this array.
   * @returns The msg sent, null if it couldn't be send.
   */
  Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null>;

  /**
   * Sends an image message to a specific chat.
   * @throws {Error} If image path leads to unexisting content (no valid img path)
   * @param chatId - The target chat JID (WhatsApp ID).
   * @param imageOptions - Options for the image being sent:
   * @param options - Additional sending options:
   *   - `normalizeMessageText`: If true, normalizes the caption
   *      (trims spaces, cleans up multi-line text).
   *   - `mentionsIds`: List of WhatsApp IDs to tag (`@user`) in the caption.
   *   - `sendRawWithoutEnqueue`: If true, bypasses the safe queue system
   *      and sends immediately.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   *
   * Behavior:
   * - Reads the image file from `imagePath` into memory and attaches it.
   * - If a caption is provided and normalization is enabled,
   *   it is cleaned before sending.
   * - Mentions are injected if `mentionsIds` is specified.
   *
   * Example:
   * ```ts
   * await socket.Send.Img("12345@s.whatsapp.net", {
   *   imagePath: "/absolute/path/to/image.png",
   *   caption: "Hello '@user'"
   * }, {
   *   mentionsIds: ["12345@s.whatsapp.net"],
   *   normalizeMessageText: true
   * });
   * ```
   */
  Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null>;

  /**
   * Sends a reaction emoji to a specific message in a chat.
   * @param chatId - The target chat JID (WhatsApp ID).
   * @param rawMsgToReactTo - The message to react to.
   * @param emojiStr - The emoji string to send as a reaction.
   * @param options - Additional sending options:
   *   - `normalizeMessageText`: If true, normalizes the emoji reaction
   *      (trims spaces, cleans up multi-line text).
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   *
   * Behavior:
   * - If the emoji string is not a single emoji character, throws an error.
   * - If the emoji reaction is valid, sends it to the target chat.
   */
  ReactEmojiToMsg(chatId: string, rawMsgToReactTo: WAMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null>;

  /**
   * Sends a sticker message to a specific chat.
   *
   * This method supports sending stickers from either:
   * 1. A **local file or Buffer** containing WebP data. IMPORTANT:(Sticker file must have '.webp' format/extension)
   * 2. A **remote URL** pointing to an accessible image (e.g., WebP hosted publicly).
   *
   * If `stickerUrlSource` is a `Buffer`, it will be sent directly.
   * If it is a `string` URL, Baileys will attempt to fetch the content from that URL.
   *
   * @param chatId - The target chat JID (WhatsApp ID), e.g., '5216121407908@s.whatsapp.net'.
   * @param stickerUrlSource - The sticker content to send:
   *   - `Buffer`: Directly sends the WebP sticker.
   *   - `string`: A public URL pointing to the sticker file. Note: WhatsApp encrypted `.enc` URLs **will not work** unless downloaded and decrypted first.
   * @param options - Optional sending options:
   *   - `sendRawWithoutEnqueue`: If true, bypasses the safe queue system and sends immediately.
   *   - Any other Baileys `MiscMessageGenerationOptions` like `quoted`, `contextInfo`, etc.
   *
   * @example
   * // Send a local WebP sticker
   * await bot.Sticker(chatId, fs.readFileSync('./stickers/dog.webp'));
   *
   * @example
   * // Send a public URL sticker (must be directly accessible)
   * await bot.Sticker(chatId, 'https://example.com/sticker.webp');
   */
  Sticker(chatId: string, stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null>;

  /**
   * Sends an **audio message** to the specified chat.
   *
   * ### Supported sources
   * 1. **Local file path** (`string`):
   *    - Absolute or relative path to an audio file (e.g., MP3, OGG, M4A).
   *    - The path is validated; an error is thrown if the file does not exist.
   * 2. **Raw buffer** (`Buffer`):
   *    - Must include a `formatExtension` (e.g., `"mp3"`, `"ogg"`, `"flac"`)
   *      so the correct MIME type can be resolved.
   *
   * @param chatId - Target chat JID (WhatsApp ID), e.g., `"5216121407908@s.whatsapp.net"`.
   * @param audioParams - The audio content to send:
   *   - `{ source: string, caption?: string }` → A local file path.
   *   - `{ source: Buffer, formatExtension: string }` → Raw buffer + extension hint.
   * @param options - Additional sending options:
   *   - `sendRawWithoutEnqueue?` → If true, bypasses the safe queue system and sends immediately.
   *   - `mentionsIds?` → JIDs of users to mention in the message.
   *   - Any other Baileys `MiscMessageGenerationOptions` like `quoted`, `contextInfo`, etc.
   *
   * @throws
   * - If a string path is provided but the file does not exist.
   * - If a buffer source is provided without `formatExtension`.
   *
   * ---
   * @example
   * // Send an MP3 file from local disk
   * await bot.Audio(chatId, { source: "./audios/voice.mp3" });
   *
   * @example
   * // Send an OGG audio buffer (e.g., downloaded from somewhere else)
   * import fs from "fs";
   *
   * const buffer = fs.readFileSync("./downloads/sample.ogg");
   * await bot.Audio(chatId, { source: buffer, formatExtension: "ogg" });
   */
  Audio(chatId: string, audioParams: WhatsMsgAudioOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null>;

  /**
   * Sends a video message to a specific chat.
   *
   * This method supports sending videos from either:
   * 1. A **local file path** (e.g., MP4, MOV, AVI).
   * 2. A **Buffer** containing raw video data.
   *
   * Behavior:
   * - If a `caption` is provided, it is normalized if
   *   `options.normalizeMessageText` is true.
   * - The MIME type is determined by the file extension:
   *   - `.mov` → `video/mov`
   *   - `.avi` → `video/avi`
   *   - Otherwise → defaults to `video/mp4`
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set.
   *
   * @param chatId - The target chat JID (WhatsApp ID), e.g. `5216121407908@s.whatsapp.net`.
   * @param videoParams - The video to send:
   *   - `sourcePath`: Absolute/relative path to video file OR a `Buffer`.
   *   - `caption` (optional): Text shown below the video in WhatsApp.
   * @param options - Additional sending options:
   *   - `normalizeMessageText`: Normalize caption text (default: true).
   *   - `mentionsIds`: Users to mention in the caption.
   *   - `sendRawWithoutEnqueue`: Send immediately, bypassing the queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   *
   * @example
   * // Send a local MP4 with caption
   * await bot.Video(chatId, { sourcePath: "./video.mp4", caption: "Check this out!" });
   *
   * @example
   * // Send a raw Buffer without queuing
   * await bot.Video(chatId, { sourcePath: fs.readFileSync("./clip.mov") }, { sendRawWithoutEnqueue: true });
   */
  Video(chatId: string, videoParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null>;

  /**
   * Sends a document (any file type) to the specified WhatsApp chat.
   *
   * The document source can be provided in two ways:
   * - As a local file path (`string`)
   * - As a `Buffer` containing the raw file data
   *
   * A display name for the document must be provided via `displayNameFile`.
   * If a file path is given, and no display name is provided, the basename of
   * the path will be used automatically.
   *
   * The MIME type is inferred from the file contents and `fileExtension`
   * (via `GetMimeType`). If it cannot be determined, it falls back to
   * `"application/octet-stream"`.
   *
   * @param chatId - WhatsApp chat JID (e.g. `"1234567890@s.whatsapp.net"`).
   * @param docParams - An object containing:
   *   - `source`: The file path or a Buffer with the document data.
   *   - `displayNameFile`: The name shown in WhatsApp for the document.
   *   - `fileExtension`: File extension (e.g. `"pdf"`, `"zip"`) to assist MIME detection.
   * @param options - Additional message-sending options (e.g. sender overrides).
   * @returns A `WAMessage` if successfully sent, otherwise `null`.
   *
   * @throws If the file path does not exist, or if `source` is neither a string nor a Buffer.
   *
   * @example
   * // From local file
   * await sender.Document("1234567890@s.whatsapp.net", {
   *   source: "./files/report.pdf",
   *   displayNameFile: "report.pdf",
   *   fileExtension: "pdf"
   * });
   *
   * @example
   * // From buffer
   * const buf = fs.readFileSync("./files/data.zip");
   * await sender.Document("1234567890@s.whatsapp.net", {
   *   source: buf,
   *   displayNameFile: "data.zip",
   *   fileExtension: "zip"
   * });
   */
  Document(chatId: string, docParams: WhatsMsgDocumentOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null>;

  /**
   * Sends a poll message to a specific chat.
   * Only works for sending, can't retrieve any data from that. (Idk how baileys library works for that, its not documented at all... 🥲)
   * WhatsApp polls allow either:
   * - **Single-answer polls** (one option selectable).
   * - **Multi-answer polls** (multiple options selectable).
   *
   * Behavior:
   * - `pollTitle` can be normalized if `normalizeTitleText` is true.
   * - `selections` can be normalized if `normalizeOptionsText` is true.
   *
   * Constraints:
   * - Poll must contain **1–12 options** (`selections` array length).
   *
   * @param chatId - The target chat JID (WhatsApp ID).
   * @param pollTitle - The question/title of the poll.
   * @param selections - Array of answer choices (min 1, max 12).
   * @param pollOptions - Options for poll behavior:
   *   - `withMultiSelect`: If true, allows multiple answers.
   *   - `normalizeTitleText`: Normalize the poll title text.
   *   - `normalizeOptionsText`: Normalize each option string.
   * @param moreOptions - Additional sending options:
   *   - `sendRawWithoutEnqueue`: Send immediately, bypass queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   * @returns Poll autoself-updating obj with the poll actualvotes, in case the poll couldn't be send, will return null instead.
   *
   * @example
   * // Single-answer poll
   * await bot.Poll(chatId, "Favorite color?", ["Red", "Blue", "Green"], { withMultiSelect: false });
   *
   * @example
   * // Multi-answer poll with normalization
   * await bot.Poll(chatId, "Pick your hobbies:", ["  Reading ", " Coding ", "Gaming"], {
   *   withMultiSelect: true,
   *   normalizeOptionsText: true,
   *   normalizeTitleText: true
   * }, { sendRawWithoutEnqueue: true });
   *
   */
  Poll(
    chatId: string,
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null>;

  /**
   * Sends a location (geographic coordinates) message to a specific chat.
   *
   * This method allows sharing a point on the map with optional metadata.
   *
   * Behavior:
   * - Validates that the latitude is between **-90 and 90** and longitude is
   *   between **-180 and 180**. If invalid, it throws an error.
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set.
   *
   * @param chatId - The target chat JID (WhatsApp ID), e.g. `5216121407908@s.whatsapp.net`.
   * @param ubicationParams - Location parameters:
   *   - `degreesLatitude`: Latitude of the location (range: -90 to 90).
   *   - `degreesLongitude`: Longitude of the location (range: -180 to 180).
   *   - `name` (optional): Short label/name for the location.
   *   - `addressText` (optional): Human-readable address string.
   * @param options - Additional sending options:
   *   - `sendRawWithoutEnqueue`: Send immediately, bypassing the queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   *
   * @returns A `WAMessage` object representing the sent location,
   *          or `null` if the message could not be sent.
   *
   * @example
   * // Send basic coordinates
   * await bot.Ubication(chatId, {
   *   degreesLatitude: 19.4326,
   *   degreesLongitude: -99.1332
   * });
   *
   * @example
   * // Send coordinates with a label and address
   * await bot.Ubication(chatId, {
   *   degreesLatitude: 40.7128,
   *   degreesLongitude: -74.0060,
   *   name: "New York City",
   *   addressText: "NY, USA"
   * }, { sendRawWithoutEnqueue: true });
   */
  Ubication(chatId: string, ubicationParams: WhatsMsgUbicationOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null>;

  /**
   * Sends a contact card (vCard) to a specific chat.
   *
   * This method generates a valid vCard internally from simple
   * `name` and `phone` fields, so callers don’t need to deal
   * with raw vCard formatting.
   *
   * Supports:
   * - Single contact card
   * - Multiple contact cards (by passing an array of contact info)
   *
   * Behavior:
   * - Phone numbers should include country code (e.g. `5216121407908`).
   * - WhatsApp requires the `waid` parameter inside the vCard to link
   *   the number to a WhatsApp account.
   *
   * @param chatId - The target chat JID (WhatsApp ID).
   * @param contacts - A single contact object or an array of contacts:
   *   - `name`: Display name for the contact.
   *   - `phone`: Phone number in international format (no `+` required).
   * @param options - Additional sending options:
   *   - `sendRawWithoutEnqueue`: Send immediately, bypass queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   *
   * @example
   * // Send one contact
   * await bot.Contact(chatId, { name: "Christian", phone: "52161402883029" });
   *
   * @example
   * // Send multiple contacts
   * await bot.Contact(chatId, [
   *   { name: "Alice", phone: "5211111111111" },
   *   { name: "Bob", phone: "5212222222222" }
   * ]);
   *
   * @note Number follows "countrycode" + "1" + "10 digits number" for latin-american countries like "5216239389304" for example in mexico. Check
   * how your country number displays in international format
   */
  Contact(
    chatId: string,
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null>;
}
