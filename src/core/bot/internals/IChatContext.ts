import type { MsgType, SenderType } from "../../../Msg.types.js";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
} from "../../whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { GroupMetadataInfo } from "../../whats_socket/internals/WhatsSocket.receiver.js";

import type { WhatsappMessage } from "../../whats_socket/types.js";
import type { ChatContextConfig } from "./ChatContext.js";

/**
 * Represents a location shared in a chat.
 */
export type ChatContextUbication = {
  /** Latitude in decimal degrees */
  degreesLatitude: number;

  /** Longitude in decimal degrees */
  degreesLongitude: number;

  /** Optional JPEG thumbnail preview of the location */
  thumbnailJpegBuffer: Uint8Array | null;

  /** Whether the location is live/real-time */
  isLive: boolean | null;
};

/**
 * Represents a contact shared in a chat.
 */
export type ChatContextContactRes = {
  /** Display name of the contact */
  name: string;

  /** Phone number of the contact */
  number: string;

  /** WhatsApp ID of the contact */
  whatsappId_PN: string;
};

/**
 * Interface for the ChatContext sugar-layer abstraction.
 *
 * Simplifies sending/receiving messages bound to a fixed chat.
 * Encapsulates all common bot patterns and helpers.
 */
export interface IChatContext {
  /**
   * The unique ID of the original participant who triggered
   * this session, if available.
   *
   * - `null` when the origin is a system event or when the
   *   participant cannot be resolved.
   * - Typically corresponds to a phone number JID or group member JID.
   *
   * **Immutable**: set only in the constructor.
   */
  readonly FixedParticipantPN: string | null;

  readonly FixedParticipantLID: string | null;

  // /**
  //  * All sending/updating-related metadata about yourself.
  //  *
  //  * - Includes Status: where you can upload to your personal status/story.
  //  */
  // readonly Myself: {
  //   readonly Status: ChatContext_Submodule_Status;
  // };

  /**
   * The WhatsApp chat ID this session is permanently bound to.
   *
   * - Always points to a valid chat JID (user, group, or broadcast).
   * - Remains constant for the lifetime of the session.
   */
  readonly FixedChatId: string;

  /**
   * The initial WhatsApp message that triggered creation of this context.
   *
   * Use this when you need the message payload itself (e.g., replying,
   * quoting, or inspecting structured message content).
   */
  readonly FixedInitialMsg: WhatsappMessage;

  /**
   * Indicates the type of the original sender (user, group, system, etc.)
   * extracted from the initial message.
   *
   * This is derived at construction time and remains constant.
   */
  readonly FixedSenderType: SenderType;

  /**
   * Configuration options for this chat context.
   *
   * Provides toggles, timeouts, or feature flags that control
   * how the session should behave.
   */
  Config: ChatContextConfig;

  // ============================ SENDING ============================
  /**
   * Sends a plain text message to the chat.
   *
   * @param text - Message body
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends an image without a caption.
   *
   * @param imagePath - Local file path to the image
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   *
   *  Behavior:
   * - Reads the image file from `imagePath` into memory and attaches it.
   * - Mentions are injected if `mentionsIds` is specified.
   */
  SendImg(imagePath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends an image to a WhatsApp chat from a local file path.
   *
   * @param imagePath - Path to the local image file.
   * @param caption - Text caption to include with the image.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Reads the image from the provided `imagePath` into memory before sending.
   * - If `options.normalizeMessageText` is `true`, the caption will be cleaned/normalized.
   * - Mentions can be included using `options.mentionsIds`.
   */
  SendImgWithCaption(imagePath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends an image to a WhatsApp chat from a buffer.
   *
   * @param imageBuffer - The image as a Buffer (ArrayBuffer).
   * @param extensionType - The image file extension/type (e.g., "png", "jpg").
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Useful when the image is generated or received dynamically and not saved on disk.
   * - This method does not include a caption. Use `SendImgFromBufferWithCaption` for captioned images.
   */
  SendImgFromBuffer(imageBuffer: Buffer, extensionType: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends an image to a WhatsApp chat from a buffer with a caption.
   *
   * @param imagePath - The image as a Buffer (ArrayBuffer).
   * @param extensionType - The image file extension/type (e.g., "png", "jpg").
   * @param caption - Text caption to include with the image.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Combines the behavior of `SendImgFromBuffer` and `SendImgWithCaption`.
   * - Useful for sending dynamically created images along with captions.
   * - Supports normalization and mentions if specified in `options`.
   */
  SendImgFromBufferWithCaption(
    imagePath: Buffer,
    extensionType: string,
    caption: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null>;

  /**
   * Reacts with an emoji to a specific message.
   *
   * @param msgToReactTo - The message to react to
   * @param emojiStr - Emoji string (e.g. "✅", "❌")
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  SendReactEmojiTo(msgToReactTo: WhatsappMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Reacts with an emoji to the initial message that started the session.
   *
   * @param emojiStr - Emoji string (e.g. "✅", "❌")
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   *
   * Behavior:
   * - If the emoji string is not a single emoji character, throws an error.
   * - If the emoji reaction is valid, sends it to the target chat.
   */
  SendReactEmojiToInitialMsg(emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Reacts with a ✅ emoji to the initial message.
   *
   * Typically used to indicate that the command completed successfully.
   *
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  Ok(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Reacts with a ⌛ emoji to the initial message.
   *
   * Typically used to indicate that the command is loading.
   *
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  Loading(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Reacts with a ❌ emoji to the initial message.
   *
   * Typically used to indicate that the command failed or was invalid.
   *
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  Fail(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends a sticker
   *
   * This method supports sending stickers from either:
   * 1. A **local file or Buffer** containing WebP data.
   * 2. A **remote URL** pointing to an accessible image (e.g., WebP hosted publicly).
   *
   * If `stickerUrlSource` is a `Buffer`, it will be sent directly.
   * If it is a `string` URL, Baileys will attempt to fetch the content from that URL.
   *
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
   *
   */
  SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends an audio message to cha.
   *
   * This method supports sending audio from:
   * 1. A **local file path** (MP3, OGG, M4A, etc.).
   *
   * @param audioSource - The audio content to send:
   *   - `string`: Either a local file path or a public URL, it will be converted to absolute path if relative given.
   *   - `WAMessage`: A WhatsApp message object containing an audioMessage.
   * @param audioFormat The audio format should be treated for. (e.g "mp3", "ogg", "flac")
   * @param options - Optional sending options:
   *   - `sendRawWithoutEnqueue`: If true, bypasses the safe queue system and sends immediately.
   *   - Any other Baileys `MiscMessageGenerationOptions` like `quoted`, `contextInfo`, etc.
   *
   * @example
   * // Send a local MP3
   * await bot.Audio(chatId, './audios/voice.mp3');
   *
   * @example
   * // Send a remote URL audio
   * await bot.Audio(chatId, 'https://example.com/audio.mp3');
   *
   * @example
   * // Forward a received WhatsApp audio message
   * await bot.Audio(chatId, receivedMessage);
   */
  SendAudio(audioSource: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends an audio message to a WhatsApp chat from a buffer.
   *
   * @param audioSource - Audio content as a `Buffer`.
   * @param formatFile - File format/extension of the audio (e.g., "mp3", "ogg").
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Useful for sending audio that is generated or downloaded dynamically and not saved on disk.
   * - The `formatFile` parameter ensures WhatsApp knows how to handle the audio format correctly.
   * - Supports optional normalization, mentions, or other sending options via `options`.
   */
  SendAudioFromBuffer(audioSource: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends a video message from a local file path.
   *
   * @param videoPath - Absolute or relative path to the video file (MP4, MOV, AVI, etc.).
   * @param options - Optional configuration for sending the message:
   *   - `normalizeMessageText`: Normalize caption text (default: true).
   *   - `mentionsIds`: Array of user IDs to mention.
   *   - `sendRawWithoutEnqueue`: Send immediately, bypassing the queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - MIME type is inferred from file extension:
   *   - `.mov` → `video/mov`
   *   - `.avi` → `video/avi`
   *   - Otherwise → `video/mp4`
   *
   * @example
   * // Send a local MP4 video
   * await chatContext.SendVideo("./video.mp4");
   *
   * @example
   * // Send a local AVI video mentioning specific users
   * await chatContext.SendVideo("./clip.avi", { mentionsIds: ["12345@s.whatsapp.net"] });
   */
  SendVideo(videoPath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends a video message with a caption from a local file path.
   *
   * @param videoPath - Absolute or relative path to the video file.
   * @param caption - Text caption to include with the video.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - MIME type detection and safe queue system are the same as `SendVideo`.
   *
   * @example
   * // Send MP4 video with caption
   * await chatContext.SendVideoWithCaption("./video.mp4", "Check this out!");
   *
   * @example
   * // Send MOV video with caption and immediate sending
   * await chatContext.SendVideoWithCaption("./clip.mov", "Important!", { sendRawWithoutEnqueue: true });
   */
  SendVideoWithCaption(videoPath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends a video message from a buffer.
   *
   * @param videoBuffer - Video content as a `Buffer`.
   * @param formatFile - File format/extension of the video (e.g., "mp4", "mov").
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Useful when the video is generated or downloaded dynamically and not saved on disk.
   * - The `formatFile` ensures WhatsApp interprets the video format correctly.
   *
   * @example
   * // Send a dynamically downloaded MP4 buffer
   * const buf = fs.readFileSync("./video.mp4");
   * await chatContext.SendVideoFromBuffer(buf, "mp4");
   */
  SendVideoFromBuffer(videoBuffer: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null>;

  /**
   * Sends a video message from a buffer with a caption.
   *
   * @param videoBuffer - Video content as a `Buffer`.
   * @param caption - Text caption to include with the video.
   * @param formatFile - File format/extension of the video (e.g., "mp4", "mov").
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Combines the behavior of `SendVideoFromBuffer` and `SendVideoWithCaption`.
   * - Supports optional normalization, mentions, or other sending options via `options`.
   *
   * @example
   * // Send buffer with caption
   * const buf = fs.readFileSync("./clip.mov");
   * await chatContext.SendVideoFromBufferWithCaption(buf, "Check this!", "mov");
   *
   * @example
   * // Send buffer immediately bypassing queue
   * await chatContext.SendVideoFromBufferWithCaption(buf, "Urgent!", "mov", { sendRawWithoutEnqueue: true });
   */
  SendVideoFromBufferWithCaption(
    videoBuffer: Buffer,
    caption: string,
    formatFile: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null>;

  /**
   * Sends a poll message.
   *
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
   * - At the time of writing (31-august-2025). This can't fetch all votes
   *  from this poll, is only sending.
   *
   * @param pollTitle - The question/title of the poll.
   * @param selections - Array of answer choices (min 1, max 12).
   * @param pollOptions - Options for poll behavior:
   *   - `withMultiSelect`: If true, allows multiple answers.
   *   - `normalizeTitleText`: Normalize the poll title text.
   *   - `normalizeOptionsText`: Normalize each option string.
   * @param options - Additional sending options:
   *   - `sendRawWithoutEnqueue`: Send immediately, bypass queue.
   *   - Any other Baileys `MiscMessageGenerationOptions`.
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
  SendPoll(
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null>;

  /**
   * Sends a location (geopoint) to the chat.
   *
   * @param degreesLatitude - Latitude of the location
   * @param degreesLongitude - Longitude of the location
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  SendUbication(degreesLatitude: number, degreesLongitude: number, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends a location (geopoint) with additional description to the chat.
   *
   * @param degreesLatitude - Latitude of the location
   * @param degreesLongitude - Longitude of the location
   * @param ubicationName - A name/title for the location (e.g., "Central Park")
   * @param moreInfoAddress - Extra textual description for the location (e.g., street, landmark)
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  SendUbicationWithDescription(
    degreesLatitude: number,
    degreesLongitude: number,
    ubicationName: string,
    moreInfoAddress: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null>;

  /**
   * Sends a contact card (vCard).
   *
   * Supports:
   * - Single contact card
   * - Multiple contact cards (by passing an array of contact info)
   *
   * Behavior:
   * - Phone numbers should include country code (e.g. `5216121407908`).
   *
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
   * how your country number displays in international format to prevent any errors.
   */
  SendContact(
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null>;

  /**
   * Sends a document message from a local file path.
   *
   * @param docPath - Absolute or relative path to the document file.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - The document file is read from the specified path and sent as a WhatsApp document message.
   * - MIME type is automatically detected based on the file extension using the `mime` library.
   * - Supports all file types compatible with WhatsApp document messages (e.g., PDF, DOC, TXT).
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set to `true` in `options`.
   *
   * @example
   * // Send a PDF document
   * await chatContext.SendDocument("./report.pdf");
   *
   * @example
   * // Send a document with mentions and immediate sending
   * await chatContext.SendDocument("./file.txt", {
   *   mentionsIds: ["5211234567890@s.whatsapp.net"],
   *   sendRawWithoutEnqueue: true
   * });
   */
  SendDocument(docPath: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends a document message from a local file path with a custom display name.
   *
   * @param docPath - Absolute or relative path to the document file.
   * @param fileNameToDisplay - Custom name to display for the document in WhatsApp.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Similar to `SendDocument`, but allows specifying a custom display name for the document.
   * - The `fileNameToDisplay` overrides the default file name derived from `docPath`.
   * - MIME type is detected based on the file extension of `docPath`.
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set to `true` in `options`.
   *
   * @example
   * // Send a PDF with a custom display name
   * await chatContext.SendDocumentWithCustomName("./report.pdf", "Annual Report 2025");
   *
   * @example
   * // Send a document with a custom name and additional options
   * await chatContext.SendDocumentWithCustomName("./data.csv", "Sales Data", {
   *   timestamp: new Date(),
   *   ephemeralExpiration: 86400
   * });
   */
  SendDocumentWithCustomName(docPath: string, fileNameToDisplay: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null>;

  /**
   * Sends a document message from a buffer with a custom display name and file extension.
   *
   * @param docBuffer - Document content as a `Buffer`.
   * @param fileNameToDisplayWithoutExt - Display name for the document (without extension).
   * @param extensionFileTypeOnly - File extension (e.g., "pdf", "docx") to determine MIME type.
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Useful for sending documents generated or downloaded dynamically without saving to disk.
   * - The `extensionFileTypeOnly` determines the MIME type (e.g., "pdf" → "application/pdf").
   * - The `fileNameToDisplayWithoutExt` is used as the display name, with `extensionFileTypeOnly` appended.
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set to `true` in `options`.
   *
   * @example
   * // Send a dynamically generated PDF buffer
   * const buf = fs.readFileSync("./document.pdf");
   * await chatContext.SendDocumentFromBuffer(buf, "Report", "pdf");
   *
   * @example
   * // Send a buffer with mentions and immediate sending
   * const buf = Buffer.from("Sample text");
   * await chatContext.SendDocumentFromBuffer(buf, "Note", "txt", {
   *   mentionsIds: ["5211234567890@s.whatsapp.net"],
   *   sendRawWithoutEnqueue: true
   * });
   */
  SendDocumentFromBuffer(
    docBuffer: Buffer,
    fileNameToDisplayWithoutExt: string,
    extensionFileTypeOnly: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null>;

  // ============================ RECEIVING ============================
  /**
   * Waits for the next message of the specified type from the original sender.
   *
   * @param expectedType - Type of message to wait for (e.g., text, media, location).
   * @param localOptions - Optional configuration overrides (e.g., timeout, cancel keywords).
   * @returns Resolves with the next matching `WhatsappMessage`, or `null` if no message is received.
   *
   * @example
   * ```ts
   * const message = await chatContext.WaitMsg(MsgType.Text, { timeoutSeconds: 30 });
   * if (message) console.log("Received message:", message);
   * else console.log("No message received within timeout");
   * ```
   */
  WaitMsg(expectedType: MsgType, localOptions?: Partial<ChatContextConfig>): Promise<WhatsappMessage | null>;

  /**
   * Waits for the next text message from the original sender.
   *
   * @param localOptions - Optional configuration overrides (e.g., timeout, cancel keywords).
   * @returns Resolves with the plain text of the next message, or `null` if no message is received.
   *
   * @example
   * ```ts
   * const text = await chatContext.WaitText({ timeoutSeconds: 20 });
   * if (text) console.log("User sent:", text);
   * else console.log("No text message received");
   * ```
   */
  WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null>;

  /**
   * Waits for the next multimedia message of the specified type (e.g., image, video, audio).
   *
   * @param msgTypeToWaitFor - Multimedia type to wait for.
   * @param localOptions - Optional configuration overrides (e.g., timeout).
   * @returns Resolves with a `Buffer` containing the media, or `null` if no message is received.
   *
   * @example
   * ```ts
   * const imageBuffer = await chatContext.WaitMultimedia(MsgType.Image, { timeoutSeconds: 30 });
   * if (imageBuffer) saveFile("image.webp", imageBuffer);
   * ```
   */
  WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<ChatContextConfig>
  ): Promise<Buffer | null>;

  /**
   * Waits for the next location message from the original sender.
   *
   * @param localOptions - Optional configuration overrides (e.g., timeout).
   * @returns Resolves with an object containing location coordinates and thumbnail, or `null` if no message is received.
   *
   * @example
   * ```ts
   * const location = await chatContext.WaitUbication({ timeoutSeconds: 30 });
   * if (location) console.log(`Lat: ${location.degreesLatitude}, Lon: ${location.degreesLongitude}`);
   * ```
   */
  WaitUbication(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextUbication | null>;

  /**
   * Waits for the next contact message from the original sender.
   *
   * @param localOptions - Optional configuration overrides (e.g., timeout).
   * @returns Resolves with an object containing contact name, number, and full WhatsApp ID, or `null` if no message is received.
   *
   * @example
   * ```ts
   * const contact = await chatContext.WaitContact({ timeoutSeconds: 30 });
   * if (contact) console.log(`Name: ${contact.name}, Number: ${contact.number}, WhatsApp ID: ${contact.whatsappId}`);
   * ```
   */
  WaitContact(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextContactRes | ChatContextContactRes[] | null>;

  /**
   * Fetches the group data for a specific chat.
   *
   * This method retrieves detailed information about the group, including its ID,
   * sending mode, owner, and participant details.
   *
   * Fun fact: The WhatsApp group sending mode can affect how messages are delivered
   * to participants, with 'Legacy' indicating older behavior and 'Modern' for the newer format.
   *
   * @returns Resolves with the `ChatContextGroupData` object containing group details,
   *          or `null` if the chat is an individual/private chat.
   *
   * @example
   * ```ts
   * const groupData = await chatContext.FetchGroupData();
   * if (groupData) {
   *   console.log("Group name:", groupData.groupName);
   *   console.log("Participants:", groupData.members.map(m => m.info?.id));
   * } else {
   *   console.log("This is an individual chat, not a group.");
   * }
   * ```
   * @throws Error if there is a problem fetching group metadata.
   */
  FetchGroupData(): Promise<GroupMetadataInfo | null>;
}
