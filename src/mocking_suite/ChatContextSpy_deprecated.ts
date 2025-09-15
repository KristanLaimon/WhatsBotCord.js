import { type ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { ChatContextContactRes, ChatContextUbication, IChatContext } from "../core/bot/internals/IChatContext.js";
import type {
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
} from "../core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { ChatContextGroupData, WhatsSocketReceiverError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocketReceiverMsgError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import type { SenderType } from "../Msg.types.js";
import { MsgType } from "../Msg.types.js";
import type { ChatContextSpyWhatsMsg } from "./WhatsSocket.receiver.mockingsuite.js";

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

//TODO: Put all this logic inside SugarSender CLASS, use original chatcontext, is not necessary to make a ChatContextSpy
/***
 * @deprecated do not use this anymore
 */
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

    const thereAreOptions = !!_localOptions || toSend || !!this.Config;
    if (thereAreOptions) {
      //Overriding priority
      const options: Partial<ChatContextConfig> = {
        //#1 first global default from MockChat options
        ...this.Config,
        //#2 second, from the msg itself
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
  SendImg(_imagePath: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgWithCaption(_imagePath: string, _caption: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgFromBuffer(_imagePath: Buffer, _extensionType: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendImgFromBufferWithCaption(
    _imagePath: Buffer,
    _extensionType: string,
    _caption: string,
    _options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendReactEmojiTo(_msgToReactTo: WhatsappMessage, _emojiStr: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendReactEmojiToInitialMsg(_emojiStr: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Ok(_options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Loading(_options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  Fail(_options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendSticker(_stickerUrlSource: string | Buffer, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendAudio(_audioSource: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendAudioFromBuffer(_audioSource: Buffer, _formatFile: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideo(_videoPath: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoWithCaption(_videoPath: string, _caption: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoFromBuffer(_videoBuffer: Buffer, _formatFile: string, _options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendVideoFromBufferWithCaption(
    _videoBuffer: Buffer,
    _caption: string,
    _formatFile: string,
    _options?: WhatsMsgSenderSendingOptions
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendPoll(
    _pollTitle: string,
    _selections: string[],
    _pollParams: WhatsMsgPollOptions,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendUbication(_degreesLatitude: number, _degreesLongitude: number, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendUbicationWithDescription(
    _degreesLatitude: number,
    _degreesLongitude: number,
    _ubicationName: string,
    _moreInfoAddress: string,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendContact(
    _contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocument(_docPath: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocumentWithCustomName(_docPath: string, _fileNameToDisplay: string, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }
  SendDocumentFromBuffer(
    _docBuffer: Buffer,
    _fileNameToDisplayWithoutExt: string,
    _extensionFileTypeOnly: string,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WhatsappMessage | null> {
    throw new Error("Method not implemented.");
  }

  WaitMultimedia(
    _msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    _localOptions?: Partial<ChatContextConfig>
  ): Promise<Buffer | null> {
    throw new Error("Method not implemented.");
  }
  WaitUbication(_localOptions?: Partial<ChatContextConfig>): Promise<ChatContextUbication | null> {
    throw new Error("Method not implemented.");
  }
  WaitContact(_localOptions?: Partial<ChatContextConfig>): Promise<ChatContextContactRes | null> {
    throw new Error("Method not implemented.");
  }
  FetchGroupData(): Promise<ChatContextGroupData | null> {
    throw new Error("Method not implemented.");
  }
}
