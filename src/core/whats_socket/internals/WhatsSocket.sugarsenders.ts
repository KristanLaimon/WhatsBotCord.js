import { type MiscMessageGenerationOptions, type WAMessage } from "baileys";
import emojiRegexFabric from "emoji-regex";
import GraphemeSplitter from "grapheme-splitter";
import fs from "node:fs";
import path from "node:path";
import { MimeTypeHelper_GetMimeTypeOf } from "../../../helpers/Mimetypes.helper";
import { Str_NormalizeLiteralString } from "../../../helpers/Strings.helper";
import { GetPath } from "../../../libs/BunPath";
import type { IWhatsSocket } from "../IWhatsSocket";

const emojiRegex = emojiRegexFabric();
const emojiSplitter = new GraphemeSplitter();

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

type WhatsMsgMediaWithCaption = {
  /**
   * Optional text to include along with the image.
   *
   * - Appears as a caption below the image in WhatsApp
   * - Can be used for descriptions, notes, or additional context
   */
  caption?: string;
};
type WhatsMsgMediaStringSource = {
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
type WhatsMsgMediaBufferSource = {
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
//TODO: Export from lib
export type WhatsMsgMediaOptions = WhatsMsgMediaWithCaption & (WhatsMsgMediaStringSource | WhatsMsgMediaBufferSource);
//TODO: Export from lib
export type WhatsMsgAudioOptions = WhatsMsgMediaStringSource | WhatsMsgMediaBufferSource;
//TODO: Export from lib
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

export class WhatsSocket_Submodule_SugarSender {
  private socket: IWhatsSocket;

  constructor(socket: IWhatsSocket) {
    this.socket = socket;
  }

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
  public async Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(
        "SugarSender.Text() received a non string text or an empty string to send, check that. Received instead: " + JSON.stringify(text, null, 2)
      );
    }
    text = options?.normalizeMessageText ?? true ? Str_NormalizeLiteralString(text) : text;
    //_getSendingMethod() returns a functions, it seems cursed I know, get used to it
    return await this._getSendingMethod(options)(chatId, { text, mentions: options?.mentionsIds }, options as MiscMessageGenerationOptions);
  }

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
  public async Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    let imgBuffer: Buffer;
    let mimeType: string;
    //1. First overload: {sourcePath: string, caption?:string}
    if (typeof imageOptions.source === "string") {
      if (!fs.existsSync(GetPath(imageOptions.source)) || !imageOptions.source || imageOptions.source.trim() === "") {
        throw new Error(
          "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" + " ImgPath: " + imageOptions.source
        );
      }
      imgBuffer = fs.readFileSync(imageOptions.source);

      //@ts-expect-error Can be usable with formatExtension as well
      mimeType = imageOptions.formatExtension
        ? //@ts-expect-error Can be usable with formatExtension as well
          MimeTypeHelper_GetMimeTypeOf({ source: imageOptions.formatExtension })
        : MimeTypeHelper_GetMimeTypeOf({ source: imageOptions.source });
    }
    //2. Second overload: {sourcePath: Buffer, caption?:string, formatExtension: string}
    else if ("formatExtension" in imageOptions) {
      imgBuffer = imageOptions.source;
      mimeType = MimeTypeHelper_GetMimeTypeOf({ source: imageOptions.source, extensionType: imageOptions.formatExtension });
    } else {
      throw new Error(
        "SugarSender.Img() bad args!, expected source in buffer or string with formatExtension prop if buffer... got instead: " +
          JSON.stringify(imageOptions, null, 2)
      );
    }
    //Common overload logic
    let captionToSend: string | undefined = imageOptions.caption;
    if (captionToSend) {
      if (options?.normalizeMessageText) {
        captionToSend = Str_NormalizeLiteralString(captionToSend);
      }
    }
    //Ends
    return await this._getSendingMethod(options)(
      chatId,
      {
        image: imgBuffer,
        caption: captionToSend,
        mentions: options?.mentionsIds,
        mimetype: mimeType,
      },
      options as MiscMessageGenerationOptions
    );
  }

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
  public async ReactEmojiToMsg(
    chatId: string,
    rawMsgToReactTo: WAMessage,
    emojiStr: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    if (typeof emojiStr !== "string") {
      throw new Error("WhatsSocketSugarSender.ReactEmojiToMsg() received an non string emoji");
    }
    const emojisCount: number = emojiSplitter.countGraphemes(emojiStr);
    if (emojisCount !== 1) {
      throw new Error(
        "WhatsSocketSugarSender.ReactEmojiToMsg() received (less than 1 or greater than 2) chars as emoji to send.... It must be a simple emoji string of 1-2 emoji char length. Received instead: " +
          emojiStr
      );
    }

    if (!emojiStr.match(emojiRegex)) {
      throw new Error("WhatsSocketSugarSender.ReactEmojiToMsg() received a non emoji reaction. Received instead: " + emojiStr);
    }

    return await this._getSendingMethod(options)(
      chatId,
      {
        react: {
          text: emojiStr,
          key: rawMsgToReactTo.key,
        },
        mentions: options?.mentionsIds,
      },
      options as MiscMessageGenerationOptions
    );
  }

  /**
   * Sends a sticker message to a specific chat.
   *
   * This method supports sending stickers from either:
   * 1. A **local file or Buffer** containing WebP data.
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
  public async Sticker(chatId: string, stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    if (typeof stickerUrlSource === "string") {
      if (!fs.existsSync(stickerUrlSource)) {
        throw new Error("WhatsSocketSugarSender.Sticker() coudn't find stickerUrlSource or it's invalid..." + "Url: " + stickerUrlSource);
      }
    }

    return await this._getSendingMethod(options)(
      chatId,
      {
        sticker: Buffer.isBuffer(stickerUrlSource)
          ? stickerUrlSource
          : {
              url: stickerUrlSource,
            },
        mentions: options?.mentionsIds,
      },
      options as MiscMessageGenerationOptions
    );
  }

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
  public async Audio(chatId: string, audioParams: WhatsMsgAudioOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimeType: string;
    //1. First overload: {source: string, caption?:string}
    if (typeof audioParams.source === "string") {
      if (!fs.existsSync(GetPath(audioParams.source))) {
        throw new Error(
          "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" +
            " AudioSourcePath: " +
            audioParams.source
        );
      }
      buffer = fs.readFileSync(audioParams.source);
      //@ts-expect-error Can be usable with format extension as well
      mimeType = audioParams.formatExtension ?? MimeTypeHelper_GetMimeTypeOf({ source: audioParams.source });
    } else if ("formatExtension" in audioParams) {
      buffer = audioParams.source;
      mimeType = MimeTypeHelper_GetMimeTypeOf({ source: audioParams.source, extensionType: audioParams.formatExtension as string });
    } else {
      throw new Error("SugarSender.Audio bad args, expected audio source in buffer or stringpath format. Got Instead: " + JSON.stringify(audioParams, null, 2));
    }
    return await this._getSendingMethod(options)(
      chatId,
      {
        audio: buffer,
        mimetype: mimeType,
        mentions: options?.mentionsIds,
      },
      options as MiscMessageGenerationOptions
    );
  }

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
  public async Video(chatId: string, videoParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimeType: string;

    //1. First overload: {source:string, caption?:string}
    if (typeof videoParams.source === "string") {
      if (!fs.existsSync(GetPath(videoParams.source))) {
        throw new Error("SugarSender.Video expected a valid video path!, doesn't exist...  Got instead: " + videoParams.source);
      }
      buffer = fs.readFileSync(videoParams.source);
      //@ts-expect-error formatExtension can be usable with this as well
      mimeType = videoParams.formatExtension ?? MimeTypeHelper_GetMimeTypeOf({ source: videoParams.source });
      //2. Second overload: {source:Buffer, caption?: string, formatExtension: string}
    } else if ("formatExtension" in videoParams) {
      buffer = videoParams.source;
      mimeType = MimeTypeHelper_GetMimeTypeOf({ source: videoParams.source, extensionType: videoParams.formatExtension });
    } else {
      throw new Error("SugarSender.Video bad args, expected video source in buffer or stringpath format. Got Instead: " + JSON.stringify(videoParams, null, 2));
    }

    //Common overload logic code
    let caption: string | undefined = videoParams.caption;
    if (caption) {
      if (options?.normalizeMessageText) {
        caption = Str_NormalizeLiteralString(caption);
      }
    }
    //Default
    return await this._getSendingMethod(options)(chatId, {
      video: buffer,
      caption: caption ?? "",
      mimetype: mimeType,
      mentions: options?.mentionsIds,
    });
  }

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
  public async Document(chatId: string, docParams: WhatsMsgDocumentOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimeType: string;
    let fileNameToDisplay: string;

    //1. First overload {source:string, caption?:string}
    if (typeof docParams.source === "string") {
      if (!fs.existsSync(GetPath(docParams.source))) {
        throw new Error(`SugarSender.Document(), received path document '${docParams.source}' doesn't exist!. Check again...`);
      }
      buffer = fs.readFileSync(docParams.source);
      mimeType = MimeTypeHelper_GetMimeTypeOf({ source: docParams.source });
      if ("fileNameToDisplay" in docParams) {
        fileNameToDisplay = docParams.fileNameToDisplay ?? path.basename(docParams.source); //Gets file name WITH extension
      } else {
        fileNameToDisplay = path.basename(docParams.source); //Gets file name WITH extension
      }
      //2. Second overload {source:Buffer, caption?: string, formatExtension:string}
    } else if ("formatExtension" in docParams) {
      buffer = docParams.source;
      mimeType = MimeTypeHelper_GetMimeTypeOf({ source: docParams.source, extensionType: docParams.formatExtension });
      fileNameToDisplay = docParams.fileNameWithoutExtension + "." + docParams.formatExtension.toLowerCase().replace(".", "");
    } else {
      throw new Error(
        "SugarSender.Document bad args, expected document source in buffer or stringpath format. Got Instead: " + JSON.stringify(docParams, null, 2)
      );
    }

    return await this._getSendingMethod(options)(chatId, {
      document: buffer,
      mimetype: mimeType,
      fileName: fileNameToDisplay,
      mentions: options?.mentionsIds,
    });
  }

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
  public async Poll(
    chatId: string,
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    let title: string = pollTitle;
    let selects: string[] = selections;

    if (!(selections.length >= 1 && selections.length <= 12)) {
      throw new Error(
        "WhatsSocketSugarSender.Poll() received less than 1 options or greather than 12, must be in range 1-12. Received: " + selections.length + " options..."
      );
    }

    if (pollParams.normalizeTitleText) {
      title = Str_NormalizeLiteralString(title);
    }

    if (pollParams.normalizeOptionsText) {
      selects = selections.map((opt) => Str_NormalizeLiteralString(opt));
    }

    return await this._getSendingMethod(moreOptions)(
      chatId,
      {
        poll: {
          name: title,
          values: selects,
          //Whats API receives 0 as multiple answers and 1 for exclusive 1 answer to polls (Thats how it works ¯\_(ツ)_/¯)
          // selectableCount: pollParams.withMultiSelect ? 0 : 1
          selectableCount: selections.length,
        },
        mentions: moreOptions?.mentionsIds,
      },
      moreOptions as MiscMessageGenerationOptions
    );

    //INFO: Uncomment this section until discover a way to fetch votes data from polls, only sending porpuses so far.
    //Baileys library doesn't have any documentation at all to achieve this, so ill wait. - 20/august/2025

    // if (msgSent) {
    //   const sugarPollObjToReturn = new WhatsPoll(this.socket, {
    //     pollOptions: selects,
    //     pollRawMsg: msgSent,
    //     titleHeader: title,
    //     withMultiSelect: pollParams.withMultiSelect
    //   });

    //   return sugarPollObjToReturn;
    // } else {
    //   return null;
    // }
  }

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
  public async Ubication(chatId: string, ubicationParams: WhatsMsgUbicationOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    if (!areValidCoordinates(ubicationParams.degreesLatitude, ubicationParams.degreesLongitude)) {
      throw new Error(
        `WhatsSocketSugarSender.Ubication() => Invalid coordinates: (${ubicationParams.degreesLatitude}, ${ubicationParams.degreesLongitude}).Latitude must be between -90 and 90, longitude between -180 and 180.`
      );
    }
    return await this._getSendingMethod(options)(
      chatId,
      {
        location: {
          degreesLatitude: ubicationParams.degreesLatitude,
          degreesLongitude: ubicationParams.degreesLongitude,
          name: ubicationParams.name,
          address: ubicationParams.addressText,
        },
        mentions: options?.mentionsIds,
      },
      options as MiscMessageGenerationOptions
    );
  }

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
  public async Contact(
    chatId: string,
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    const arr = Array.isArray(contacts) ? contacts : [contacts];

    const vCards = arr.map((c) => {
      if (!c.name || !c.phone) {
        throw new Error("Invalid contact: name and phone are required");
      }
      return `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL;type=CELL;type=VOICE;waid=${c.phone}:${c.phone}
END:VCARD`;
    });

    return await this._getSendingMethod(options)(
      chatId,
      {
        contacts: {
          displayName: arr.length === 1 ? arr[0]!.name : `${arr.length} contacts`,
          contacts: vCards.map((vc) => ({ vcard: vc })),
        },
        mentions: options?.mentionsIds,
      },
      options as MiscMessageGenerationOptions
    );
  }

  /**
   * Selects the sending method based on the options provided.
   *
   * If `options` is not provided or `sendRawWithoutEnqueue` is false,
   * the safe queue system will be used to send the message.
   *
   * If `options.sendRawWithoutEnqueue` is true, the message will be
   * sent immediately without using the safe queue system.
   *
   * @param options - The sending options, or undefined to use the default behavior.
   * @returns The method to call to send the message.
   */
  private _getSendingMethod(options?: WhatsMsgSenderSendingOptionsMINIMUM) {
    if (!options) return this.socket._SendSafe;
    else if (options.sendRawWithoutEnqueue) {
      return this.socket._SendRaw;
    } else {
      return this.socket._SendSafe;
    }
  }
}

function areValidCoordinates(lat: number, lon: number): boolean {
  return typeof lat === "number" && typeof lon === "number" && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

//Buffer is only used to differentiate type params, still needed for intelissense!
