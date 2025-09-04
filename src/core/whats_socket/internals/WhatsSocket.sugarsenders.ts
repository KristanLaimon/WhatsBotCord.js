import { type MiscMessageGenerationOptions, type WAMessage, downloadMediaMessage } from "baileys";
import emojiRegexFabric from "emoji-regex";
import fs from "fs";
import GraphemeSplitter from "grapheme-splitter";
import path from "path";
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

export type WhatsMsgMediaOptions = {
  /**
   * Path to the source file to send.
   *
   * - Supports both relative and absolute paths
   * - For projects where this library is compiled/bundled,
   *   using absolute paths is recommended to avoid issues
   *   with build environments or working directories
   */
  sourcePath: string | Buffer;

  /**
   * Optional text to include along with the image.
   *
   * - Appears as a caption below the image in WhatsApp
   * - Can be used for descriptions, notes, or additional context
   */
  caption?: string;
};

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
    text = options?.normalizeMessageText ?? true ? Str_NormalizeLiteralString(text) : text;
    //_getSendingMethod() returns a functions, it seems cursed I know, get used to it
    return await this._getSendingMethod(options)(chatId, { text, mentions: options?.mentionsIds }, options as MiscMessageGenerationOptions);
  }

  /**
   * Sends an image message to a specific chat.
   * @throws {Error} If image path leads to unexisting content (no valid img path)
   * @param chatId - The target chat JID (WhatsApp ID).
   * @param imageOptions - Options for the image being sent:
   *   - `imagePath`: Path to the image file (absolute or relative).
   *   - `caption` (optional): Text caption to send with the image.
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
  public async Img(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    if (!fs.existsSync(imageOptions.sourcePath)) {
      throw new Error(
        "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" + " ImgPath: " + imageOptions.sourcePath
      );
    }

    let captionToSend: string | null = imageOptions.caption ?? null;
    if (captionToSend) {
      if (options?.normalizeMessageText) {
        captionToSend = Str_NormalizeLiteralString(captionToSend);
      }
    }
    return await this._getSendingMethod(options)(
      chatId,
      {
        image: Buffer.isBuffer(imageOptions.sourcePath) ? imageOptions.sourcePath : fs.readFileSync(GetPath(imageOptions.sourcePath)),
        caption: captionToSend ?? "",
        mentions: options?.mentionsIds,
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
      },
      options as MiscMessageGenerationOptions
    );
  }

  /**
   * Sends an audio message to a specific chat.
   *
   * This method supports sending audio from:
   * 1. A **local file path** (MP3, OGG, M4A, etc.).
   * 2. A **remote URL** (publicly accessible audio file).
   * 3. A **WhatsApp audio message object** (voice note or audio message) via `downloadMediaMessage`.
   *
   * @param chatId - The target chat JID (WhatsApp ID), e.g., '5216121407908@s.whatsapp.net'.
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
  public async Audio(chatId: string, audioSource: string | Buffer | WAMessage, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimetype = "audio/mpeg";

    if (Buffer.isBuffer(audioSource)) {
      buffer = audioSource;
    } else if (typeof audioSource === "string") {
      // Check if local file exists
      if (fs.existsSync(GetPath(audioSource))) {
        buffer = fs.readFileSync(GetPath(audioSource));
        const ext = path.extname(GetPath(audioSource)).toLowerCase();
        if (ext === ".ogg") mimetype = "audio/ogg";
        if (ext === ".m4a") mimetype = "audio/mp4";
      } else {
        if (!audioSource.startsWith("http")) {
          throw new Error("It's not an existing file in your system or even a url!, check your audioSource. Audio source given to send: " + audioSource);
        }
        // Fetch remote URL
        const res = await fetch(audioSource);
        if (!res.ok) {
          console.error(`Failed to fetch audio: ${res.statusText}`);
          return null;
        }
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else if ("message" in audioSource && audioSource.message?.audioMessage) {
      // WhatsApp message object
      buffer = await downloadMediaMessage(audioSource, "buffer", {});
      mimetype = audioSource.message.audioMessage?.mimetype || "audio/mpeg";
    } else {
      throw new Error("WhatsSocketSugarSender: Invalid audio source provided when trying to send audio msg: " + audioSource);
    }

    return await this._getSendingMethod(options)(
      chatId,
      {
        audio: buffer,
        mimetype,
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
   * @param videoSourceParams - The video to send:
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
  public async Video(chatId: string, videoSourceParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    const videoSource = videoSourceParams.sourcePath;
    if (typeof videoSource === "string" && !Buffer.isBuffer(videoSource)) {
      //It's a local video file path
      if (!fs.existsSync(videoSource)) {
        throw new Error("WhatsSocketSugarSender.Video() recognized video source as simple string path but doesn't exist or corrupted. Given: " + videoSource);
      }
    } else if (Buffer.isBuffer(videoSource)) {
      //Ok, do nothing, continue.
    } else {
      throw new Error(
        "WhatsSocketSugarSender.Video() couldn't recognize video source, its neither a path nor a buffer. Given: " + videoSourceParams.sourcePath
      );
    }

    let caption: string | undefined = videoSourceParams.caption;
    if (caption) {
      if (options?.normalizeMessageText) {
        caption = Str_NormalizeLiteralString(caption);
      }
    }
    //Default
    let mimeTypeToUse: string = "video/mp4";
    if (typeof videoSourceParams.sourcePath === "string") {
      const videoPath: string = videoSourceParams.sourcePath;
      if (videoPath.endsWith(".mov")) mimeTypeToUse = "video/mov";
      else if (videoPath.endsWith(".avi")) mimeTypeToUse = "video/avi";
      //Otherwise, use default "video/mp4"
    }
    return await this._getSendingMethod(options)(chatId, {
      video: Buffer.isBuffer(videoSourceParams.sourcePath) ? videoSourceParams.sourcePath : fs.readFileSync(GetPath(videoSourceParams.sourcePath)),
      caption: caption ?? "",
      mimetype: mimeTypeToUse,
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
