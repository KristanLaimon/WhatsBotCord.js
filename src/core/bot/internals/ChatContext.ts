import { downloadMediaMessage } from "baileys";
import { autobind } from "../../../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetSenderType, MsgHelper_FullMsg_GetText } from "../../../helpers/Msg.helper.js";
import { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappIndividualIdentifier } from "../../../Whatsapp.types.js";
import {
  type ChatContextGroupData,
  type WhatsSocket_Submodule_Receiver,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverHelper_isReceiverError,
} from "../../whats_socket/internals/WhatsSocket.receiver.js";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsSocket_Submodule_SugarSender,
} from "../../whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { WhatsappMessage } from "../../whats_socket/types.js";

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
  public SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Sticker(this._fixedChatId, stickerUrlSource, options);
  }

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
  @autobind
  public SendAudio(audioSource: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Audio(this._fixedChatId, { source: audioSource }, options);
  }

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
  @autobind
  public SendAudioFromBuffer(audioSource: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Audio(this._fixedChatId, { source: audioSource, formatExtension: formatFile }, options);
  }

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
  @autobind
  public SendVideo(videopath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: videopath }, options);
  }

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
  @autobind
  public SendVideoWithCaption(videoPath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: videoPath, caption: caption }, options);
  }

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
  @autobind
  public SendVideoFromBuffer(videoBuffer: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: videoBuffer, formatExtension: formatFile }, options);
  }

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
  @autobind
  public SendVideoFromBufferWithCaption(
    videoBuffer: Buffer,
    caption: string,
    formatFile: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this._fixedChatId, { source: videoBuffer, formatExtension: formatFile, caption: caption }, options);
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
  @autobind
  public async WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Text, localOptions);
    if (!found) return null;
    const extractedTxtToReturn: string | null = MsgHelper_FullMsg_GetText(found);
    return extractedTxtToReturn;
  }

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
  @autobind
  public async WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<ChatContextConfig>
  ): Promise<Buffer | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(msgTypeToWaitFor, localOptions);
    if (!found) return null;
    const buffer = await downloadMediaMessage(found, "buffer", {});
    return buffer;
  }

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
  @autobind
  public async WaitUbication(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextUbication | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Ubication, localOptions);
    if (!found) return null;
    const res = found?.message?.locationMessage;
    if (!res) return null;
    return {
      degreesLatitude: res.degreesLatitude ?? -1,
      degreesLongitude: res.degreesLongitude ?? -1,
      thumbnailJpegBuffer: res.jpegThumbnail ?? null,
      isLive: res.isLive ?? false,
    };
  }

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
  @autobind
  public async WaitContact(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextContactRes | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Contact, localOptions);
    if (!found) return null;
    const contactMessage = found?.message?.contactMessage;
    if (!contactMessage) return null;

    const contactNumber = contactMessage.vcard?.match(/WAID=(\d+)/i)?.[1] || "";

    const whatsappId = contactNumber ? `${contactNumber}${WhatsappIndividualIdentifier}` : "";

    return {
      name: contactMessage.displayName || "",
      number: contactNumber,
      whatsappId: whatsappId,
    };
  }

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
  @autobind
  public async FetchGroupData(): Promise<ChatContextGroupData | null> {
    if (this._senderType === SenderType.Individual) {
      return null;
    }
    return await this._internalReceive.GetGroupMetadata(this._fixedChatId);
  }
}

/**
 * Represents a location shared in a chat.
 *
 * Includes geographic coordinates and an optional thumbnail image buffer.
 */
export type ChatContextUbication = {
  /** Latitude in decimal degrees */
  degreesLatitude: number;

  /** Longitude in decimal degrees */
  degreesLongitude: number;

  /** Optional JPEG thumbnail preview of the location */
  thumbnailJpegBuffer: Uint8Array | null;

  /** Whether the location is live/real-time (e.g., live location sharing) */
  isLive: boolean | null;
};

/**
 * Represents a contact shared in a chat.
 *
 * Contains the contact's display name, phone number, and WhatsApp ID.
 */
export type ChatContextContactRes = {
  /** Display name of the contact */
  name: string;

  /** Phone number of the contact */
  number: string;

  /** WhatsApp ID of the contact */
  whatsappId: string;
};
