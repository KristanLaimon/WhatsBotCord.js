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
import type { ChatContextContactRes, ChatContextUbication, IChatContext } from "./IChatContext.js";

export type ChatContextConfig = WhatsSocketReceiverWaitOptions;

/**
 * A sugar-layer abstraction for sending/receiving msgs bound to the actual chat.
 *
 * This class simplifies sending messages and reactions to a fixed chat
 * without needing to repeatedly provide the chat ID. It also provides
 * helpers for common bot patterns like reacting with ✅ or ❌ to the
 * initial message and other common high-level utilities.
 */
export class ChatContext implements IChatContext {
  /**
   * Low-level sender dependency responsible for dispatching
   * messages, reactions, edits, and other outbound events.
   *
   * This is an internal utility—use higher-level convenience
   * methods instead of calling this directly where possible.
   */
  private _internalSend: WhatsSocket_Submodule_SugarSender;

  /**
   * Low-level receiver dependency responsible for listening
   * to incoming WhatsApp events (messages, status updates, etc).
   *
   * Exposed internally so that session features can react to
   * real-time events within the same chat context.
   */
  private _internalReceive: WhatsSocket_Submodule_Receiver;

  public readonly FixedOriginalParticipantId: string | null;

  public readonly FixedChatId: string;

  public readonly FixedInitialMsg: WhatsappMessage;

  public readonly FixedSenderType: SenderType;

  public Config: ChatContextConfig;

  /**
   * Creates a new chat session bound to a specific chat and initial message.
   *
   * @param originalSenderID - The ID of the participant that triggered this session,
   *   or `null` if the origin cannot be determined.
   * @param fixedChatId - The WhatsApp chat JID this context is tied to.
   * @param initialMsg - The original message object that caused this context to spawn.
   * @param senderDependency - Internal sender utility for dispatching messages.
   * @param receiverDependency - Internal receiver utility for subscribing to events.
   * @param config - Context configuration controlling runtime behavior.
   *
   * @remarks
   * - All `Fixed*` properties are immutable once the context is created.
   * - The context is designed to encapsulate state and metadata for a
   *   single session, preventing accidental leakage between chats.
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
    this.FixedOriginalParticipantId = originalSenderID;
    this._internalSend = senderDependency;
    this._internalReceive = receiverDependency;
    this.FixedChatId = fixedChatId;
    this.FixedInitialMsg = initialMsg;
    this.FixedSenderType = MsgHelper_FullMsg_GetSenderType(this.FixedInitialMsg);
  }

  @autobind
  public SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Text(this.FixedChatId, text, options);
  }

  @autobind
  public SendImg(imagePath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this.FixedChatId, { source: imagePath, caption: undefined }, options);
  }

  @autobind
  public SendImgWithCaption(imagePath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this.FixedChatId, { source: imagePath, caption }, options);
  }

  @autobind
  public SendImgFromBuffer(imagePath: Buffer<ArrayBuffer>, extensionType: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this.FixedChatId, { source: imagePath, formatExtension: extensionType, caption: undefined }, options);
  }

  @autobind
  public SendImgFromBufferWithCaption(
    imagePath: Buffer,
    extensionType: string,
    caption: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Image(this.FixedChatId, { source: imagePath, formatExtension: extensionType, caption: caption }, options);
  }

  @autobind
  public SendReactEmojiTo(msgToReactTo: WhatsappMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this.FixedChatId, msgToReactTo, emojiStr, options);
  }

  @autobind
  public SendReactEmojiToInitialMsg(emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this.FixedChatId, this.FixedInitialMsg, emojiStr, options);
  }

  @autobind
  public Ok(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this.FixedChatId, this.FixedInitialMsg, "✅", options);
  }

  @autobind
  public Loading(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this.FixedChatId, this.FixedInitialMsg, "⌛", options);
  }

  @autobind
  public Fail(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.ReactEmojiToMsg(this.FixedChatId, this.FixedInitialMsg, "❌", options);
  }

  @autobind
  public SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Sticker(this.FixedChatId, stickerUrlSource, options);
  }

  @autobind
  public SendAudio(audioSource: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Audio(this.FixedChatId, { source: audioSource }, options);
  }

  @autobind
  public SendAudioFromBuffer(audioSource: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Audio(this.FixedChatId, { source: audioSource, formatExtension: formatFile }, options);
  }

  @autobind
  public SendVideo(videopath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this.FixedChatId, { source: videopath }, options);
  }

  @autobind
  public SendVideoWithCaption(videoPath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this.FixedChatId, { source: videoPath, caption: caption }, options);
  }

  @autobind
  public SendVideoFromBuffer(videoBuffer: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this.FixedChatId, { source: videoBuffer, formatExtension: formatFile }, options);
  }

  @autobind
  public SendVideoFromBufferWithCaption(
    videoBuffer: Buffer,
    caption: string,
    formatFile: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Video(this.FixedChatId, { source: videoBuffer, formatExtension: formatFile, caption: caption }, options);
  }

  @autobind
  public SendPoll(
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Poll(this.FixedChatId, pollTitle, selections, pollParams, options);
  }

  @autobind
  public SendUbication(degreesLatitude: number, degreesLongitude: number, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Ubication(this.FixedChatId, { degreesLatitude, degreesLongitude, addressText: undefined, name: undefined }, options);
  }

  @autobind
  public SendUbicationWithDescription(
    degreesLatitude: number,
    degreesLongitude: number,
    ubicationName: string,
    moreInfoAddress: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Ubication(this.FixedChatId, { degreesLatitude, degreesLongitude, addressText: moreInfoAddress, name: ubicationName }, options);
  }

  @autobind
  public SendContact(
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Contact(this.FixedChatId, contacts, options);
  }

  @autobind
  public SendDocument(docPath: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(this.FixedChatId, { source: docPath }, options);
  }

  @autobind
  public SendDocumentWithCustomName(
    docPath: string,
    fileNameToDisplay: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(this.FixedChatId, { source: docPath, fileNameToDisplay: fileNameToDisplay }, options);
  }

  @autobind
  public SendDocumentFromBuffer(
    docBuffer: Buffer,
    fileNameToDisplayWithoutExt: string,
    extensionFileTypeOnly: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Document(
      this.FixedChatId,
      { source: docBuffer, fileNameWithoutExtension: fileNameToDisplayWithoutExt, formatExtension: extensionFileTypeOnly },
      options
    );
  }
  //============================ RECEIVING ==============================

  @autobind
  public async WaitMsg(expectedType: MsgType, localOptions?: Partial<ChatContextConfig>): Promise<WhatsappMessage | null> {
    switch (this.FixedSenderType) {
      case SenderType.Unknown:
        throw new Error(
          "[FATAL ERROR] on ChatContext.WaitMsg: ChatContext Obj received a non valid WhatsappMessage as parameter (couldn't identify sender type)"
        );
      case SenderType.Group:
        if (!this.FixedOriginalParticipantId) {
          throw new Error(
            "[FATAL ERROR]: This shouldn't happen at all. Couldn't find group participant from group msg!... Report this bug as a github issue please."
          );
        }
        try {
          return await this._internalReceive.WaitUntilNextRawMsgFromUserIDInGroup(this.FixedOriginalParticipantId, this.FixedChatId, expectedType, {
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
          return await this._internalReceive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(this.FixedChatId, expectedType, {
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

  @autobind
  public async WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Text, localOptions);
    if (!found) return null;
    const extractedTxtToReturn: string | null = MsgHelper_FullMsg_GetText(found);
    return extractedTxtToReturn;
  }

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

  @autobind
  public async FetchGroupData(): Promise<ChatContextGroupData | null> {
    if (this.FixedSenderType === SenderType.Individual) {
      return null;
    }
    return await this._internalReceive.GetGroupMetadata(this.FixedChatId);
  }
}
