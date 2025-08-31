import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsSocketSugarSender_Submodule
} from 'src/core/whats_socket/internals/WhatsSocket.sugarsenders';
import type { WAMessage } from "baileys";

/**
 * A sugar-layer abstraction for sending/receiving msgs bound to the actual chat.
 * 
 * This class simplifies sending messages and reactions to a fixed chat
 * without needing to repeatedly provide the chat ID. It also provides
 * helpers for common bot patterns like reacting with ✅ or ❌ to the
 * initial message and other common high-level utilities.
 */
export class ChatSession {
  /** Low-level sender dependency used to actually send messages */
  private _internalSend: WhatsSocketSugarSender_Submodule;

  /** The chat ID this session is permanently bound to */
  private _fixedChatId: string;

  /** The initial message that triggered the command/session */
  private _initialMsg: WAMessage;

  /**
   * Creates a new chat session bound to a specific chat and initial message.
   * 
   * @param fixedChatId - The WhatsApp chat ID this session is tied to
   * @param initialMsg - The original triggering message (used for reactions)
   * @param senderDependency - Low-level sender utility used to dispatch messages
   */
  constructor(fixedChatId: string, initialMsg: WAMessage, senderDependency: WhatsSocketSugarSender_Submodule) {
    this._internalSend = senderDependency;
    this._fixedChatId = fixedChatId;
    this._initialMsg = initialMsg;
  }

  /**
   * Sends a plain text message to the chat.
   * 
   * @param text - Message body
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  public SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    return this._internalSend.Text(this._fixedChatId, text, options);
  }

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
  public SendImg(imagePath: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    return this._internalSend.Img(this._fixedChatId, { sourcePath: imagePath, caption: undefined }, options);
  }

  /**
   * Sends an image with a caption.
   * 
   * @param imagePath - Local file path to the image
   * @param caption - Caption text
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   * 
   * Behavior:
   * - Reads the image file from `imagePath` into memory and attaches it.
   * - If normalization is enabled, caption  will be cleaned/normalized before sending.
   *  (Can be enabled in options object param with "normalizeMessageText" property)
   * - Mentions are injected if `mentionsIds` is specified.
   */
  public SendImgWithCaption(imagePath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    return this._internalSend.Img(this._fixedChatId, { sourcePath: imagePath, caption }, options);
  }

  /**
   * Reacts with an emoji to a specific message.
   * 
   * @param msgToReactTo - The message to react to
   * @param emojiStr - Emoji string (e.g. "✅", "❌")
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  public SendReactEmojiTo(msgToReactTo: WAMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, msgToReactTo, emojiStr, options);
  }

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
  public SendReactEmojiToInitialMsg(emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, this._initialMsg, emojiStr, options);
  }

  /**
   * Reacts with a ✅ emoji to the initial message.
   * 
   * Typically used to indicate that the command completed successfully.
   * 
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  public Ok(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, this._initialMsg, "✅", options);
  }

  /**
   * Reacts with a ❌ emoji to the initial message.
   * 
   * Typically used to indicate that the command failed or was invalid.
   * 
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  public Fail(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, this._initialMsg, "❌", options);
  }

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
  public SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Sticker(this._fixedChatId, stickerUrlSource, options);
  }

  /**
   * Sends an audio message to cha.
   *
   * This method supports sending audio from:
   * 1. A **local file path** (MP3, OGG, M4A, etc.).
   * 2. A **remote URL** (publicly accessible audio file).
   * 3. A **WhatsApp audio message object** (voice note or audio message) via `downloadMediaMessage`.
   *
   * @param audioSource - The audio content to send:
   *   - `string`: Either a local file path or a public URL, it will be converted to absolute path if relative given.
   *   - `Buffer`: Raw audio data.
   *   - `WAMessage`: A WhatsApp message object containing an audioMessage.
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
  public SendAudio(audioSource: string | Buffer | WAMessage, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Audio(this._fixedChatId, audioSource, options);
  }

  /**
   * Sends a video message;
   * 
   * This method supports sending videos from either:
   * 1. A **local file path** (e.g., MP4, MOV, AVI).
   * 2. A **Buffer** containing raw video data.
   *
   * Behavior:
   * - The MIME type is determined by the file extension:
   *   - `.mov` → `video/mov`
   *   - `.avi` → `video/avi`
   *   - Otherwise → defaults to `video/mp4`
   * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set in options param.
   *
   * @param sourcePath Absolute/relative path to video file OR a `Buffer`.
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
  public SendVideo(sourcePath: string | Buffer, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { sourcePath: sourcePath, caption: undefined }, options);
  }

  /**
  * Sends a video message;
  * 
  * This method supports sending videos from either:
  * 1. A **local file path** (e.g., MP4, MOV, AVI).
  * 2. A **Buffer** containing raw video data.
  *
  * Behavior:
  * - The MIME type is determined by the file extension:
  *   - `.mov` → `video/mov`
  *   - `.avi` → `video/avi`
  *   - Otherwise → defaults to `video/mp4`
  * - Uses the safe queue system unless `sendRawWithoutEnqueue` is set in options param.
  *
  * @param sourcePath Absolute/relative path to video file OR a `Buffer`.
  * @param caption String caption to send along the video
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
  public SendVideWithCaption(sourcePath: string | Buffer, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { sourcePath: sourcePath, caption: caption }, options);
  }

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
  public SendPoll(pollTitle: string, selections: string[], pollParams: WhatsMsgPollOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Poll(this._fixedChatId, pollTitle, selections, pollParams, options);
  }

  /**
   * Sends a location (geopoint) to the chat.
   * 
   * @param degreesLatitude - Latitude of the location
   * @param degreesLongitude - Longitude of the location
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  public SendUbication(degreesLatitude: number, degreesLongitude: number, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Ubication(this._fixedChatId, { degreesLatitude, degreesLongitude, addressText: undefined, name: undefined }, options);
  };

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
  public SendUbicationWithDescription(degreesLatitude: number, degreesLongitude: number, ubicationName: string, moreInfoAddress: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Ubication(this._fixedChatId, { degreesLatitude, degreesLongitude, addressText: moreInfoAddress, name: ubicationName }, options);
  };

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
  public SendContact(contacts: { name: string; phone: string } | { name: string; phone: string }[], options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    return this._internalSend.Contact(this._fixedChatId, contacts, options)
  }
}


// amongus zorro bruh skibidi beatbox - N.