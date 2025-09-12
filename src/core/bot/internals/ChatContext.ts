import { downloadMediaMessage } from "baileys";
import { autobind } from "../../../helpers/Decorators.helper";
import { MsgHelper_FullMsg_GetSenderType, MsgHelper_FullMsg_GetText } from "../../../helpers/Msg.helper";
import { MsgType, SenderType } from "../../../Msg.types";
import {
  type WhatsSocket_Submodule_Receiver,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverHelper_isReceiverError,
} from "../../whats_socket/internals/WhatsSocket.receiver";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsSocket_Submodule_SugarSender,
} from "../../whats_socket/internals/WhatsSocket.sugarsenders";
import type { WhatsappMessage } from "../../whats_socket/types";

export type ChatContextConfig = WhatsSocketReceiverWaitOptions;

/**
 * A sugar-layer abstraction for sending/receiving msgs bound to the actual chat.
 *
 * This class simplifies sending messages and reactions to a fixed chat
 * without needing to repeatedly provide the chat ID. It also provides
 * helpers for common bot patterns like reacting with ✅ or ❌ to the
 * initial message and other common high-level utilities.
 */
export class ChatContext {
  /** Low-level sender dependency used to actually send messages */
  private _internalSend: WhatsSocket_Submodule_SugarSender;
  private _internalReceive: WhatsSocket_Submodule_Receiver;

  /** The chat ID this session is permanently bound to */
  private _fixedOriginalSenderId: string | null;
  private _fixedChatId: string;

  /** The initial message that triggered the command/session */
  private _initialMsg: WhatsappMessage;

  private _senderType: SenderType;

  /**
   * Retrieves the a copy from the original WAMessage object that triggered this session.
   *
   * Useful if you need to access the message's metadata, such as the sender's ID
   * or the message ID.
   *
   * @returns The raw WAMessage object that triggered this session.
   */
  public get InitialRawMsg(): WhatsappMessage {
    return structuredClone(this._initialMsg);
  }

  public Config: ChatContextConfig;

  /**
   * Creates a new chat session bound to a specific chat and initial message.
   *
   * @param fixedChatId - The WhatsApp chat ID this session is tied to
   * @param initialMsg - The original triggering message (used for reactions)
   * @param senderDependency - Low-level sender utility used to dispatch messages
   */
  constructor(
    originalSenderID: string | null,
    fixedChatId: string,
    initialMsg: WhatsappMessage,
    senderDependency: WhatsSocket_Submodule_SugarSender,
    receiverDependency: WhatsSocket_Submodule_Receiver,
    config: ChatContextConfig
  ) {
    this.Config = config;
    this._fixedOriginalSenderId = originalSenderID;
    this._internalSend = senderDependency;
    this._internalReceive = receiverDependency;
    this._fixedChatId = fixedChatId;
    this._initialMsg = initialMsg;
    this._senderType = MsgHelper_FullMsg_GetSenderType(this._initialMsg);
  }

  /**
   * Sends a plain text message to the chat.
   *
   * @param text - Message body
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  @autobind
  public SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
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
  @autobind
  public SendImg(imagePath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this._fixedChatId, { source: imagePath, caption: undefined }, options);
  }

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
  @autobind
  public SendImgWithCaption(imagePath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this._fixedChatId, { source: imagePath, caption }, options);
  }

  /**
   * Sends an image to a WhatsApp chat from a buffer.
   *
   * @param imagePath - The image as a Buffer (ArrayBuffer).
   * @param extensionType - The image file extension/type (e.g., "png", "jpg").
   * @param options - Optional configuration for sending the message.
   * @returns A promise that resolves to the sent WhatsApp message object, or `null` if sending fails.
   *
   * @remarks
   * - Useful when the image is generated or received dynamically and not saved on disk.
   * - This method does not include a caption. Use `SendImgFromBufferWithCaption` for captioned images.
   */
  @autobind
  public SendImgFromBuffer(imagePath: Buffer<ArrayBuffer>, extensionType: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this._fixedChatId, { source: imagePath, formatExtension: extensionType, caption: undefined }, options);
  }

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
  @autobind
  public SendImgFromBufferWithCaption(
    imagePath: Buffer,
    extensionType: string,
    caption: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this._fixedChatId, { source: imagePath, formatExtension: extensionType, caption: caption }, options);
  }

  /**
   * Reacts with an emoji to a specific message.
   *
   * @param msgToReactTo - The message to react to
   * @param emojiStr - Emoji string (e.g. "✅", "❌")
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  @autobind
  public SendReactEmojiTo(msgToReactTo: WhatsappMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
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
  @autobind
  public SendReactEmojiToInitialMsg(emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
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
  @autobind
  public Ok(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, this._initialMsg, "✅", options);
  }

  /**
   * Reacts with a ⌛ emoji to the initial message.
   *
   * Typically used to indicate that the command is loading.
   *
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  @autobind
  public Loading(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this._fixedChatId, this._initialMsg, "⌛", options);
  }

  /**
   * Reacts with a ❌ emoji to the initial message.
   *
   * Typically used to indicate that the command failed or was invalid.
   *
   * @param options - Optional send configuration
   * @returns The WhatsApp message object, or `null` if sending failed
   */
  @autobind
  public Fail(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
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
  @autobind
  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Sends a sticker message to a specific chat.
   *
   * This method supports sending stickers from either:

/*******  397404fb-aa15-44eb-a632-715d654dd013  *******/
  public SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
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
  @autobind
  public SendAudio(audioSource: string | Buffer, audioFormat: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Audio(this._fixedChatId, audioSource, audioFormat, options);
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
  @autobind
  public SendVideo(sourcePath: string | Buffer, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: sourcePath, caption: undefined }, options);
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
  @autobind
  public SendVideoWithCaption(sourcePath: string | Buffer, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: sourcePath, caption: caption }, options);
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

  @autobind
  public SendPoll(
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
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
  @autobind
  public SendUbication(degreesLatitude: number, degreesLongitude: number, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Ubication(this._fixedChatId, { degreesLatitude, degreesLongitude, addressText: undefined, name: undefined }, options);
  }

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
  @autobind
  public SendUbicationWithDescription(
    degreesLatitude: number,
    degreesLongitude: number,
    ubicationName: string,
    moreInfoAddress: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Ubication(this._fixedChatId, { degreesLatitude, degreesLongitude, addressText: moreInfoAddress, name: ubicationName }, options);
  }

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
  @autobind
  public SendContact(
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Contact(this._fixedChatId, contacts, options);
  }

  @autobind
  public SendDocument(docPath: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(this._fixedChatId, { source: docPath }, options);
  }

  @autobind
  public SendDocumentWithCustomName(
    docPath: string,
    fileNameToDisplay: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(this._fixedChatId, { source: docPath, fileNameToDisplay: fileNameToDisplay }, options);
  }

  @autobind
  public SendDocumentFromBuffer(
    docBuffer: Buffer,
    fileNameToDisplayWithoutExt: string,
    extensionFileTypeOnly: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(
      this._fixedChatId,
      { source: docBuffer, fileNameWithoutExtension: fileNameToDisplayWithoutExt, formatExtension: extensionFileTypeOnly },
      options
    );
  }
  //============================ RECEIVING ==============================
  /**
   * Waits for the next incoming message of the given `expectedType`, restricted to the
   * original user who initiated this chat context.
   *
   * - In **group chats**, only messages from the fixed original sender will be considered.
   *   Messages from other participants are ignored without resolving the promise.
   * - In **private chats**, only the initiating user’s replies are considered.
   *
   * Behavior:
   * - If the user sends the configured **cancel keyword**, the ongoing command is aborted
   *   immediately (the bot stays alive, but this flow stops).
   * - If the wait times out (no message arrives within the configured window),
   *   the method resolves with `null`.
   * - If a valid message arrives in time, the full `WhatsappMessage` object is returned.
   *
   * @param expectedType - Type of message to wait for (e.g., text, media).
   * @param localOptions - Optional overrides for waiting configuration (e.g., timeout).
   * @returns The next matching `WhatsappMessage`, or `null` if none is received.
   * @throws If an invalid sender type is detected or if unexpected receiver errors occur.
   */
  @autobind
  public async WaitMsg(expectedType: MsgType, localOptions?: Partial<ChatContextConfig>): Promise<WhatsappMessage | null> {
    switch (this._senderType) {
      case SenderType.Unknown:
        throw new Error(
          "[FATAL ERROR] on ChatContext.WaitMsg: ChatContext Obj received a non valid WhatsappMessage as parameter (couldn't identify sender type)"
        );
      case SenderType.Group:
        if (!this._fixedOriginalSenderId) {
          throw new Error(
            "[FATAL ERROR]: This shouldn't happen at all. Couldn't find group participant from group msg!... Report this bug as a github issue please."
          );
        }
        try {
          return await this._internalReceive.WaitUntilNextRawMsgFromUserIDInGroup(this._fixedOriginalSenderId, this._fixedChatId, expectedType, {
            ...this.Config,
            ...localOptions,
          });
        } catch (e) {
          if (WhatsSocketReceiverHelper_isReceiverError(e)) {
            if (!e.wasAbortedByUser) {
              return null;
            }
          }
          throw e;
        }
      case SenderType.Individual:
        try {
          return await this._internalReceive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(this._fixedChatId, expectedType, {
            ...this.Config,
            ...localOptions,
          });
        } catch (e) {
          if (WhatsSocketReceiverHelper_isReceiverError(e)) {
            if (!e.wasAbortedByUser) {
              return null;
            }
          }
          throw e;
        }
    }
  }

  /**
   * Waits for the next text message from the original user who initiated this chat.
   *
   * Messages from other participants (in groups) or from different users will be ignored
   * without resolving this promise.
   *
   * @param localOptions - Optional waiting configuration (e.g., timeout)
   * @returns The plain text content of the next message, or `null` if none is received
   */
  @autobind
  public async WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Text, localOptions);
    if (!found) return null;
    const extractedTxtToReturn: string | null = MsgHelper_FullMsg_GetText(found);
    return extractedTxtToReturn;
  }

  /**
   * recommended to store them im .webp file!
   * @nottested
   */
  @autobind
  public async WaitMultimedia(msgTypeToWaitFor: MsgTypeMultimediaOnly, localOptions?: Partial<ChatContextConfig>): Promise<Buffer | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(msgTypeToWaitFor, localOptions);
    if (!found) return null;
    const buffer = await downloadMediaMessage(found, "buffer", {});
    return buffer;
  }

  //TODO: It needs:
  // [ ]: WaitReactionEmoji
  // [ ]: WaitUbication
  // [ ]: WaitPoll
  // [X]: WaitText
  // [ ]: WaitContact
}
export type MsgTypeMultimediaOnly = MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio;
// amongus zorro bruh skibidi beatbox - N.
