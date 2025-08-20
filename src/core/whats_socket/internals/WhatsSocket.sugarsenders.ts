import { type MiscMessageGenerationOptions, type WAMessage } from "baileys";
import fs from "fs";
import { Str_NormalizeLiteralString } from 'src/helpers/Strings.helper';
import type { IWhatsSocketMinimum } from '../IWhatsSocket';

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
}

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

export type WhatsMsgSenderSendingImgOptions = {
  /**
   * Path to the image file to send.
   *
   * - Supports both relative and absolute paths
   * - For projects where this library is compiled/bundled,
   *   using absolute paths is recommended to avoid issues
   *   with build environments or working directories
   */
  imagePath: string;

  /**
   * Optional text to include along with the image.
   *
   * - Appears as a caption below the image in WhatsApp
   * - Can be used for descriptions, notes, or additional context
   */
  caption?: string;
}


export class WhatsSocketSugarSender {
  private socket: IWhatsSocketMinimum;

  constructor(socket: IWhatsSocketMinimum) {
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
   * @returns A promise that resolves when the text message has been sent successfully.
   */
  public async Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions) {
    text = options?.normalizeMessageText ? Str_NormalizeLiteralString(text) : text;
    //_getSendingMethod() returns a functions, it seems cursed I know, get used to it 
    await (this._getSendingMethod(options))(chatId, { text, mentions: options?.mentionsIds }, options as MiscMessageGenerationOptions);
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
  public async Img(chatId: string, imageOptions: WhatsMsgSenderSendingImgOptions, options?: WhatsMsgSenderSendingOptions): Promise<boolean> {
    if (!fs.existsSync(imageOptions.imagePath)) {
      throw new Error("Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path");
    }

    let captionToSend: string | null = imageOptions.caption ?? null;
    if (captionToSend) {
      if (options?.normalizeMessageText) {
        captionToSend = Str_NormalizeLiteralString(captionToSend);
      }
    }
    await (this._getSendingMethod(options))(chatId, {
      image: fs.readFileSync(imageOptions.imagePath),
      caption: captionToSend ?? "",
      mentions: options?.mentionsIds
    }, options as MiscMessageGenerationOptions);
    return true;
  }

  public async ReactEmojiToMsg(chatId: string, rawMsgToReactTo: WAMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<void> {
    await (this._getSendingMethod(options))(chatId, {
      react: {
        text: emojiStr,
        key: rawMsgToReactTo.key
      }
    });
  }

  // public async ReactEmojiToQuotedMsg(chatId: string, quotedMsg: WhatsMsgQuoted, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM) {
  //   await (this._getSendingMethod(options))(chatId, {
  //     react: {
  //       text: emojiStr,
  //       key: {
  //         remoteJid: chatId,
  //         id: quotedMsg.id,
  //         participant: quotedMsg.participantIdMsgComesFrom,
  //         fromMe: true
  //       }
  //     }
  //   });
  // }

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
    if (!options)
      return this.socket.SendSafe;
    else if (options.sendRawWithoutEnqueue) {
      return this.socket.SendRaw;
    } else {
      return this.socket.SendSafe;
    }
  }
}
