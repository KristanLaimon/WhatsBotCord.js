import { downloadMediaMessage } from "baileys";
import { autobind } from "../../../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetSenderType, MsgHelper_FullMsg_GetText } from "../../../helpers/Msg.helper.js";
import { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import type { IWhatsSocket_Submodule_Receiver } from "../../whats_socket/internals/IWhatsSocket.receiver.js";
import type {
  IWhatsSocket_Submodule_SugarSender,
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
} from "../../whats_socket/internals/IWhatsSocket.sugarsender.js";
import {
  type GroupMetadataInfo,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverHelper_isReceiverError,
} from "../../whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "../../whats_socket/types.js";
import type {
  ChatContextContactRes,
  ChatContextUbication,
  IChatContext,
  IChatContext_CloneTargetedTo_FromIds_Params,
  IChatContext_CloneTargetedTo_FromWhatsmsg_Params,
} from "./IChatContext.js";

export type IChatContextConfig = WhatsSocketReceiverWaitOptions & {
  /**
   * Used primarly in mocking system
   */
  customSenderType_Internal?: SenderType;
};

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
  private _internalSend: IWhatsSocket_Submodule_SugarSender;

  /**
   * Low-level receiver dependency responsible for listening
   * to incoming WhatsApp events (messages, status updates, etc).
   *
   * Exposed internally so that session features can react to
   * real-time events within the same chat context.
   */
  private _internalReceive: IWhatsSocket_Submodule_Receiver;

  public readonly FixedParticipantPN: string | null;

  public readonly FixedParticipantLID: string | null;

  public readonly FixedChatId: string;

  public readonly FixedInitialMsg: WhatsappMessage;

  public readonly FixedSenderType: SenderType;

  public Config: IChatContextConfig;

  /**
   * Creates a new chat session bound to a specific chat and initial message.
   *
   * @param participantID_LID - The ID of the participant that triggered this session,
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
    participantID_LID: string | null,
    participantID_PN: string | null,
    fixedChatId: string,
    initialMsg: WhatsappMessage,
    senderDependency: IWhatsSocket_Submodule_SugarSender,
    receiverDependency: IWhatsSocket_Submodule_Receiver,
    config: IChatContextConfig
  ) {
    this.Config = config;
    this.FixedParticipantLID = participantID_LID;
    this.FixedParticipantPN = participantID_PN;
    this._internalSend = senderDependency;
    this._internalReceive = receiverDependency;
    this.FixedChatId = fixedChatId;
    this.FixedInitialMsg = initialMsg;
    this.FixedSenderType = config.customSenderType_Internal ?? MsgHelper_FullMsg_GetSenderType(this.FixedInitialMsg);
  }

  @autobind
  public Clone(): IChatContext {
    return new ChatContext(
      this.FixedParticipantLID,
      this.FixedParticipantPN,
      this.FixedChatId,
      this.FixedInitialMsg,
      this._internalSend,
      this._internalReceive,
      this.Config
    );
  }

  @autobind
  public CloneButTargetedTo(params: IChatContext_CloneTargetedTo_FromWhatsmsg_Params | IChatContext_CloneTargetedTo_FromIds_Params): IChatContext {
    if ("initialMsg" in params) {
      const keysData = params.initialMsg.key;

      let ID_PN: string | null = null;
      let ID_LID: string | null = null;

      //Neccesary due to how bailey.js library works. Check update to v7.0.0 on their official page to understand this
      if (keysData.participant) {
        if (keysData.participant.endsWith(WhatsappLIDIdentifier)) {
          ID_LID = keysData.participant;
        } else if (keysData.participant.endsWith(WhatsappPhoneNumberIdentifier)) {
          ID_PN = keysData.participant;
        }
      }

      if (keysData.participantAlt) {
        if (keysData.participantAlt.endsWith(WhatsappLIDIdentifier)) {
          ID_LID = keysData.participantAlt;
        } else if (keysData.participantAlt.endsWith(WhatsappPhoneNumberIdentifier)) {
          ID_PN = keysData.participantAlt;
        }
      }

      //prettier-ignore
      return new ChatContext(
        ID_LID,
        ID_PN,
        params.initialMsg.key.remoteJid!,
        params.initialMsg,
        this._internalSend,
        this._internalReceive,
        params?.newConfig ?? this.Config
      );
    } else {
      if (params.senderType === SenderType.Group) {
        return new ChatContext(
          params.participant_LID ?? this.FixedParticipantLID,
          params.participant_LID ?? this.FixedParticipantPN,
          params.groupChatId,
          this.FixedInitialMsg,
          this._internalSend,
          this._internalReceive,
          params?.newConfig ?? this.Config
        );
      } else {
        return new ChatContext(
          null,
          null,
          params.userChatId,
          this.FixedInitialMsg,
          this._internalSend,
          this._internalReceive,
          params?.newConfig ?? this.Config
        );
      }
    }
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
    return this._internalSend.Location(this.FixedChatId, { degreesLatitude, degreesLongitude, addressText: undefined, name: undefined }, options);
  }

  @autobind
  public SendUbicationWithDescription(
    degreesLatitude: number,
    degreesLongitude: number,
    ubicationName: string,
    moreInfoAddress: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    return this._internalSend.Location(this.FixedChatId, { degreesLatitude, degreesLongitude, addressText: moreInfoAddress, name: ubicationName }, options);
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
  public async WaitMsg(expectedType: MsgType, localOptions?: Partial<IChatContextConfig>): Promise<WhatsappMessage | null> {
    switch (this.FixedSenderType) {
      case SenderType.Unknown:
        throw new Error(
          "[FATAL ERROR] on ChatContext.WaitMsg: ChatContext Obj received a non valid WhatsappMessage as parameter (couldn't identify sender type)"
        );
      case SenderType.Group:
        if (!this.FixedParticipantLID) {
          throw new Error(
            "[FATAL ERROR]: This shouldn't happen at all. Couldn't find group participant from group msg!... Report this bug as a github issue please."
          );
        }
        try {
          return await this._internalReceive.WaitUntilNextRawMsgFromUserIDInGroup(
            this.FixedParticipantLID,
            this.FixedParticipantPN,
            this.FixedChatId,
            expectedType,
            {
              ...this.Config,
              ...localOptions,
            }
          );
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
  public async WaitText(localOptions?: Partial<IChatContextConfig>): Promise<string | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(MsgType.Text, localOptions);
    if (!found) return null;
    const extractedTxtToReturn: string | null = MsgHelper_FullMsg_GetText(found);
    return extractedTxtToReturn;
  }

  @autobind
  public async WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<IChatContextConfig>
  ): Promise<Buffer | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(msgTypeToWaitFor, localOptions);
    if (!found) return null;
    const buffer = await downloadMediaMessage(found, "buffer", {});
    return buffer;
  }

  @autobind
  public async WaitUbication(localOptions?: Partial<IChatContextConfig>): Promise<ChatContextUbication | null> {
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
  public async WaitContact(localOptions?: Partial<IChatContextConfig>): Promise<ChatContextContactRes | ChatContextContactRes[] | null> {
    // Wait for a contact message
    const message = await this.WaitMsg(MsgType.Contact, localOptions);
    if (!message) return null;

    // Handle single contact message
    if (message.message?.contactMessage) {
      const contact = message.message.contactMessage;
      const number = contact.vcard?.match(/WAID=(\d+)/i)?.[1] || "";
      return {
        name: contact.displayName || "",
        number,
        whatsappId_PN: number ? `${number}${WhatsappPhoneNumberIdentifier}` : "",
      };
    }

    // Handle multiple contacts message
    if (message.message?.contactsArrayMessage?.contacts) {
      return message.message.contactsArrayMessage.contacts.map((contact) => {
        const number = contact.vcard?.match(/WAID=(\d+)/i)?.[1] || "";
        return {
          name: contact.displayName || "",
          number,
          whatsappId_PN: number ? `${number}${WhatsappPhoneNumberIdentifier}` : "",
        } satisfies ChatContextContactRes;
      });
    }

    return null;
  }

  @autobind
  public async FetchGroupData(): Promise<GroupMetadataInfo | null> {
    if (this.FixedSenderType === SenderType.Individual) {
      return null;
    }
    return await this._internalReceive.FetchGroupData(this.FixedChatId);
  }
}
