import { type MiscMessageGenerationOptions, type WAMessage } from "baileys";
import emojiRegexFabric from "emoji-regex";
import GraphemeSplitter from "grapheme-splitter";
import fs from "node:fs";
import path from "node:path";
import { MimeTypeHelper_GetMimeTypeOf, MimeTypeHelper_IsAudio, MimeTypeHelper_IsImage, MimeTypeHelper_IsVideo } from "../../../helpers/Mimetypes.helper.js";
import { Str_NormalizeLiteralString } from "../../../helpers/Strings.helper.js";
import { GetPath } from "../../../libs/BunPath.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type {
  IWhatsSocket_Submodule_SugarSender,
  WhatsMsgAudioOptions,
  WhatsMsgDocumentOptions,
  WhatsMsgMediaOptions,
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsMsgUbicationOptions,
} from "./IWhatsSocket.sugarsender.js";

const emojiRegex = emojiRegexFabric();
const emojiSplitter = new GraphemeSplitter();

/**
 * A utility class for sending various types of WhatsApp messages with simplified APIs.
 * This class acts as a wrapper around the core WhatsApp socket functionality,
 * providing methods to send text, images, videos, audio, stickers, documents,
 * polls, locations, and contacts with proper validation and formatting.
 *
 * @remarks
 * - All methods support optional sending configurations, such as bypassing the
 *   safe queue system or mentioning users.
 * - Media-related methods validate file existence and MIME types before sending.
 * - The class leverages Baileys' `MiscMessageGenerationOptions` for additional
 *   message customization.
 */
export class WhatsSocket_Submodule_SugarSender implements IWhatsSocket_Submodule_SugarSender {
  /** Strong dependency, needs to be inejcted from constructor */
  private socket: IWhatsSocket;

  /**
   * Initializes the SugarSender with a WhatsApp socket instance.
   *
   * @param socket - The WhatsApp socket instance used for sending messages.
   */
  constructor(socket: IWhatsSocket) {
    this.socket = socket;
  }

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

  public async Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    let imgBuffer: Buffer;
    let mimeType: string;
    //1. First overload: {sourcePath: string, caption?:string}
    if (typeof imageOptions.source === "string") {
      //1.1 Check if its a valid img type at least
      if (!MimeTypeHelper_IsImage(imageOptions.source)) {
        throw new Error("WhatsSocketSugarSender.Image() can't send a non IMAGE FILE!. What you were trying to send: " + imageOptions.source);
      }

      //1.2 If using custom formatExtension, check if its a valid custom img valid format
      if ("formatExtension" in imageOptions) {
        if (!MimeTypeHelper_IsImage(imageOptions.formatExtension)) {
          throw new Error(
            `WhatsSockerSugarSender.Image(), you are sending a valid file, but you are trying to send it with custom extension which is not a file type => '${imageOptions.formatExtension}'`
          );
        }
      }

      //1.3 Proceed checking if img file to send exists
      if (!fs.existsSync(GetPath(imageOptions.source)) || !imageOptions.source || imageOptions.source.trim() === "") {
        throw new Error(
          "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" + " ImgPath: " + imageOptions.source
        );
      }

      //Let's continue
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

  public async Sticker(chatId: string, stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    if (typeof stickerUrlSource === "string") {
      if (!stickerUrlSource.endsWith(".webp")) {
        throw new Error("WhatsSocketSugarSender.Sticker() received a non .webp sticker to send. Must be in .webp format first!");
      }
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

  public async Audio(chatId: string, audioParams: WhatsMsgAudioOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimeType: string;
    //1. First overload: {source: string, caption?:string}
    if (typeof audioParams.source === "string") {
      if (!MimeTypeHelper_IsAudio(audioParams.source)) {
        throw new Error(
          "Bad arguments: WhatsSocketSugarSender.Audio() received a non audio file to send (checked from extension format). Expected .mp3, .wav, and others but gotten instead: " +
            audioParams.source
        );
      }

      if ("formatExtension" in audioParams) {
        if (!MimeTypeHelper_IsAudio(audioParams.formatExtension)) {
          throw new Error("Bad arguments: WhatsSocketSugarSender.Audio() received a non audio custom extension. Received: " + audioParams.formatExtension);
        }
      }

      if (!fs.existsSync(GetPath(audioParams.source))) {
        throw new Error(
          "Bad arguments: WhatsSocketSugarSender tried to send an img with incorrect path!, check again your img path" +
            " AudioSourcePath: " +
            audioParams.source
        );
      }
      buffer = fs.readFileSync(audioParams.source);
      //@ts-expect-error Can be usable with format extension as well
      mimeType = audioParams.formatExtension
        ? //@ts-expect-error Can be usable with format extension as well
          MimeTypeHelper_GetMimeTypeOf({ source: audioParams.formatExtension })
        : MimeTypeHelper_GetMimeTypeOf({ source: audioParams.source });
    } else if ("formatExtension" in audioParams) {
      if (!MimeTypeHelper_IsAudio(audioParams.formatExtension)) {
        throw new Error(
          "Bad args => SugarSender.Audio() received buffer and a non-video custom extension type. Extension type received: " + audioParams.formatExtension
        );
      }

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

  public async Video(chatId: string, videoParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    let buffer: Buffer;
    let mimeType: string;

    //1. First overload: {source:string, caption?:string}
    if (typeof videoParams.source === "string") {
      if (!MimeTypeHelper_IsVideo(videoParams.source)) {
        throw new Error("Bad args: WhatsSugarSender.Video() received a non video file to send (checked from extension). Gotten instead: " + videoParams.source);
      }

      if ("formatExtension" in videoParams) {
        if (!MimeTypeHelper_IsVideo(videoParams.formatExtension as string)) {
          throw new Error(
            "Bad args: WhatsSugarSender.Video() received a NON custom video file format .extension. Given instead: " + videoParams.formatExtension
          );
        }
      }

      if (!fs.existsSync(GetPath(videoParams.source))) {
        throw new Error("SugarSender.Video expected a valid video path!, doesn't exist...  Got instead: " + videoParams.source);
      }

      buffer = fs.readFileSync(videoParams.source);
      //@ts-expect-error Can be usable with format extension as well
      mimeType = videoParams.formatExtension
        ? //@ts-expect-error Can be usable with format extension as well
          MimeTypeHelper_GetMimeTypeOf({ source: videoParams.formatExtension })
        : MimeTypeHelper_GetMimeTypeOf({ source: videoParams.source });
      //2. Second overload: {source:Buffer, caption?: string, formatExtension: string}
    } else if ("formatExtension" in videoParams) {
      if (!MimeTypeHelper_IsVideo(videoParams.formatExtension)) {
        throw new Error(
          "Bad args => SugarSender.Video() received a buffer with a NON image formatExtension (for mimetypes). FormatExtension provided: " +
            videoParams.formatExtension
        );
      }
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
    return await this._getSendingMethod(options)(
      chatId,
      {
        video: buffer,
        caption: caption ?? "",
        mimetype: mimeType,
        mentions: options?.mentionsIds,
      },
      options
    );
  }

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
        // fileNameToDisplay = docParams.fileNameToDisplay ?? path.basename(docParams.source); //Gets file name WITH extension
        fileNameToDisplay =
          !docParams.fileNameToDisplay || docParams.fileNameToDisplay.trim() === "" ? path.basename(docParams.source) : docParams.fileNameToDisplay;
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

    return await this._getSendingMethod(options)(
      chatId,
      {
        document: buffer,
        mimetype: mimeType,
        fileName: fileNameToDisplay,
        mentions: options?.mentionsIds,
      },
      options
    );
  }

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

    for (let i = 0; i < selects.length; i++) {
      const selectionTxt = selects[i]!;
      if (selectionTxt.trim() === "") {
        throw new Error(`Bad Args: SugarSender.Poll(): Option ${i + 1} is empty string!, you can't send non-text options...`);
      }
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

  public async Location(chatId: string, ubicationParams: WhatsMsgUbicationOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
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
