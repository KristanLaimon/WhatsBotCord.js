import { type ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { ChatContextContactRes, ChatContextUbication, IChatContext } from "../core/bot/internals/IChatContext.js";
import type { ChatContextGroupData, WhatsSocketReceiverError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocketReceiverMsgError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
} from "../core/whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import type { SenderType } from "../Msg.types.js";
import { MsgType } from "../Msg.types.js";

function CreateSuccessWhatsMsg(participantId: string | null, chatId: string): WhatsappMessage {
  const toReturn: WhatsappMessage = {
    key: {
      fromMe: false,
      id: "success_id_message_id",
      participant: participantId ?? undefined,
      remoteJid: chatId,
    },
  };
  return toReturn;
}

export type ChatContextSpyWhatsMsg = {
  rawMsg: WhatsappMessage;
  options?: WhatsMsgSenderSendingOptions | WhatsMsgSenderSendingOptionsMINIMUM;
};

export default class ChatContextSpy implements IChatContext {
  public readonly FixedOriginalParticipantId: string | null;
  public readonly FixedChatId: string;
  public readonly FixedSenderType: SenderType;
  public readonly FixedInitialMsg: WhatsappMessage;
  public Config: ChatContextConfig;
  private _queuedContent: ChatContextSpyWhatsMsg[];

  //========== TEXT ===========
  public SentMessages_Text: Array<{
    text: string;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  public Waited_Text: Array<{ options: Partial<ChatContextConfig> }> = [];

  //================================================= Constructor ==============================================
  constructor(queuedContent: ChatContextSpyWhatsMsg[], participantId: string | null, chatId: string, senderType: SenderType, config: ChatContextConfig) {
    this.FixedOriginalParticipantId = participantId;
    this.FixedChatId = chatId;
    this.FixedSenderType = senderType;
    this.Config = config;
    this._queuedContent = queuedContent;

    //Just for mock, it won't be used at all!
    this.FixedInitialMsg = CreateSuccessWhatsMsg("participantdefault@id", "chatdefault@id");
  }

  //============ Sending section =================

  public async SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    this.SentMessages_Text.push({ text: text, options: options });
    return CreateSuccessWhatsMsg(this.FixedOriginalParticipantId, this.FixedChatId);
  }

  //============ Waiting section =================
  public async WaitText(localOptions?: Partial<ChatContextConfig>): Promise<string | null> {
    const toReturn: WhatsappMessage | null = await this.WaitMsg(MsgType.Text, localOptions);
    if (!toReturn) return null;
    const text: string | null = MsgHelper_FullMsg_GetText(toReturn);
    if (!text) return null;
    return text;
  }

  //_local Options is not used, just used in real commands, here is not necessary;
  public async WaitMsg(expectedType: MsgType, _localOptions?: Partial<ChatContextConfig>): Promise<WhatsappMessage | null> {
    if (this._queuedContent.length === 0) {
      throw new Error("ChatContext is trying to wait a msg that will never arrives!... Use MockChat.Send*() to enqueue what to return!");
    }
    const toSend = this._queuedContent.shift()!;
    const actualMsg_msgType = MsgHelper_FullMsg_GetMsgType(toSend.rawMsg);

    const thereAreOptions = !!_localOptions || toSend.options || !!this.Config;
    if (thereAreOptions) {
      //Overriding priority
      const options: Partial<ChatContextConfig> = {
        //#1 first global default from MockChat options
        ...this.Config,
        //#2 second, from the msg itself
        ...toSend.options,
        //#3 from this method
        ..._localOptions,
      };

      //Actually, only used cancelKeywords param!
      if (options?.cancelKeywords) {
        if (actualMsg_msgType === MsgType.Text) {
          const txt = MsgHelper_FullMsg_GetText(toSend.rawMsg);
          if (txt) {
            //Possible problem if is 10000 chars long?, well, its for mocking purposes, so...
            const wordsLowerCased = txt.split(" ").map((word) => word.toLowerCase());
            for (const cancelWord of options.cancelKeywords) {
              if (wordsLowerCased.includes(cancelWord.toLowerCase())) {
                throw {
                  errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting,
                  chatId: this.FixedChatId,
                  userId: this.FixedOriginalParticipantId,
                  wasAbortedByUser: true,
                } satisfies WhatsSocketReceiverError;
              }
            }
          } //if (txt)
        }
      }
    }

    if (actualMsg_msgType !== expectedType) {
      throw new Error(`ChatContext received a msg of type ${MsgType[actualMsg_msgType]}`);
    }

    if (_localOptions) {
      switch (actualMsg_msgType) {
        case MsgType.Text:
          this.Waited_Text.push({ options: _localOptions });
          break;
      }
    }

    return toSend.rawMsg;
  }

  @autobind
  public ClearMocks(): void {
    this.SentMessages_Text = [];
    this.Waited_Text = [];
  }

  //==== testing ====
  SendImg(imagePath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgWithCaption(imagePath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgFromBuffer(imagePath: Buffer, extensionType: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgFromBufferWithCaption(
    imagePath: Buffer,
    extensionType: string,
    caption: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendReactEmojiTo(msgToReactTo: WhatsappMessage, emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendReactEmojiToInitialMsg(emojiStr: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Ok(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Loading(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Fail(options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendSticker(stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendAudio(audioSource: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendAudioFromBuffer(audioSource: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideo(videoPath: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoWithCaption(videoPath: string, caption: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoFromBuffer(videoBuffer: Buffer, formatFile: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoFromBufferWithCaption(
    videoBuffer: Buffer,
    caption: string,
    formatFile: string,
    options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendPoll(
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendUbication(degreesLatitude: number, degreesLongitude: number, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendUbicationWithDescription(
    degreesLatitude: number,
    degreesLongitude: number,
    ubicationName: string,
    moreInfoAddress: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendContact(
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocument(docPath: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocumentWithCustomName(docPath: string, fileNameToDisplay: string, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocumentFromBuffer(
    docBuffer: Buffer,
    fileNameToDisplayWithoutExt: string,
    extensionFileTypeOnly: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }

  WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<ChatContextConfig>
  ): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }
  WaitUbication(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextUbication | null> {
    throw new Error("Method not implemented.");
  }
  WaitContact(localOptions?: Partial<ChatContextConfig>): Promise<ChatContextContactRes | null> {
    throw new Error("Method not implemented.");
  }
  FetchGroupData(): Promise<ChatContextGroupData | null> {
    throw new Error("Method not implemented.");
  }
}
