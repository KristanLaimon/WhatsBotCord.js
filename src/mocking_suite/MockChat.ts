import type { WhatsBotOptions } from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import { ChatContext } from "../core/bot/internals/ChatContext.js";
import CommandsSearcher from "../core/bot/internals/CommandsSearcher.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { WhatsSocketReceiverWaitOptions } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_Receiver } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_SugarSender } from "../core/whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { WhatsSocketMockOptions } from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { MsgHelper_ExtractQuotedMsgInfo } from "../helpers/Msg.helper.js";
import type { IBotCommand } from "../index.js";
import { MsgType, SenderType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";

// Minimal dependencies to mock
// const participantId: string | undefined = "fakeuser@whatsapp.es";
// const chatId: string = "fakeId@g.us";
// const initialMsg: WhatsappMessage = {
//   key: {
//     fromMe: false,
//     participant: participantId,
//     remoteJid: chatId,
//     id: "Whatsbotcord_==idMessageMock==",
//   },
// };
// const config: WhatsSocketReceiverWaitOptions = {
//   cancelKeywords: ["cancel"],
//   ignoreSelfMessages: true,
//   timeoutSeconds: 15,
//   cancelFeedbackMsg: "Default cancel message mocking, user has canceled this command with a cancel word",
//   wrongTypeFeedbackMsg: "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
// };
// const mockSocket = new WhatsSocketMock();
// const receiver = new WhatsSocket_Submodule_Receiver(mockSocket);
// const sender = new WhatsSocket_Submodule_SugarSender(mockSocket);
// const ctx = new ChatContext(participantId, chatId, initialMsg, sender, receiver, config);

export type MockingChatParams = {
  //Packed complex configs objects
  internalMessagingOptions?: WhatsSocketMockOptions;
  chatContextConfig?: Partial<ChatContextConfig>;
  botSettings?: Partial<WhatsBotOptions>;

  //Separated simple configs lines
  customChatId?: string;
  customParticipantId?: string;
  args?: string[];
  msgType?: MsgType;
  senderType?: SenderType;
};

export type MockingChatMsgToSend = {
  rawMsg: WhatsappMessage;
  // options?: WhatsMsgSenderSendingOptions;
};

 class MockingChat {
  // INPUT from mock to command
  public EnqueuedMsgsFromUser: MockingChatMsgToSend[] = [];

  // OUTPUT from command
  // public SentFromCommand_Texts: Array<{
  //   text: string;
  //   options?: WhatsMsgSenderSendingOptions;
  // }> = [];

  // public SentFromCommand_Imgs: Array<{
  //   source: Buffer | string;
  //   caption?: string;
  //   options?: WhatsMsgSenderSendingOptions;
  // }> = [];

  // public SentFromCommand_ReactionEmojis: Array<{
  //   emoji: string;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  // public SentFromCommand_Stickers: Array<{
  //   source: Buffer | string;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  // public SentFromCommand_Audios: Array<{
  //   source: Buffer | string;
  //   formatFile?: string;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  // public SentFromCommand_Videos: Array<{
  //   source: Buffer | string;
  //   formatFile?: string;
  //   caption?: string;
  //   options?: WhatsMsgSenderSendingOptions;
  // }> = [];

  // public SentFromCommand_Polls: Array<{
  //   pollTitle: string;
  //   selections: string[];
  //   pollParams: WhatsMsgPollOptions;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  // public SentFromCommand_Contacts: Array<{
  //   contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  // public SentFromCommand_Documents: Array<{
  //   docPath: string;
  //   fileNameToDisplay: string;
  //   options?: WhatsMsgSenderSendingOptionsMINIMUM;
  // }> = [];

  //Internal deps
  private _command: IBotCommand;
  private _mockSocket: WhatsSocketMock;
  private _receiver: WhatsSocket_Submodule_Receiver;
  private _sender: WhatsSocket_Submodule_SugarSender;
  private _botOptions: WhatsBotOptions;
  private _constructorConfig?: MockingChatParams;

  private _participantIdFromConstructor: string;
  private _chatIdFromConstructor: string;
  private _initialMsgFromConstructor: WhatsappMessage;
  private _ctx: ChatContext;

  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    // Full dependency chain orchestation!
    //#1 ==================================
    const participantId: string = additionalOptions?.customParticipantId ?? "fakeUserLidOnGroupOnly" + WhatsappLIDIdentifier;
    this._participantIdFromConstructor = participantId;
    //#2 ==================================
    const chatId: string = additionalOptions?.customChatId ?? "fakeChatId" + WhatsappGroupIdentifier;
    this._chatIdFromConstructor = chatId;
    //#3 ==================================
    const defaultSocketOPTIONS: WhatsSocketMockOptions = {
      minimumMilisecondsDelayBetweenMsgs: additionalOptions?.internalMessagingOptions?.maxQueueLimit ?? 0,
      maxQueueLimit: additionalOptions?.internalMessagingOptions?.maxQueueLimit ?? 1000,
    };
    //#4 ==================================
    const initialMockMsg: WhatsappMessage = {
      key: {
        fromMe: false,
        //Its recommended to set to null if individual chats     all this documentation goes to MockingChatParams doc string
        //Its string recommended to customize it if needed
        //Normally is only 34123123123@lid, but here is with text to give more info to developer
        participant: participantId,
        //Its strong recommended to customize it if needed
        //Normally is 23423424@g.us but here is with text to give more info to developer
        remoteJid: chatId,
        //Not really necessary to custom i guess (could it be needed?)
        id: "Whatsbotcord_==idMessageMock==",
      },
    };
    this._initialMsgFromConstructor = initialMockMsg;
    //#5 ==================================
    const defaultChatContextOptions: WhatsSocketReceiverWaitOptions = {
      cancelKeywords: additionalOptions?.chatContextConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: additionalOptions?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: additionalOptions?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        additionalOptions?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        additionalOptions?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
    };

    //================================== Dependency making ==================================
    this._mockSocket = new WhatsSocketMock(defaultSocketOPTIONS);
    this._receiver = new WhatsSocket_Submodule_Receiver(this._mockSocket);
    this._sender = new WhatsSocket_Submodule_SugarSender(this._mockSocket);
    this._ctx = new ChatContext(participantId, chatId, initialMockMsg, this._sender, this._receiver, defaultChatContextOptions);
    this._command = commandToTest;

    // ==== Bot mocking config ====
    this._botOptions = {
      cancelFeedbackMsg: additionalOptions?.botSettings?.cancelFeedbackMsg ?? "Bot Option: cancelFeedbackMsg mock",
      cancelKeywords: additionalOptions?.botSettings?.cancelKeywords ?? ["cancel"],
      commandPrefix: additionalOptions?.botSettings?.commandPrefix ?? "!",
      credentialsFolder: additionalOptions?.botSettings?.credentialsFolder ?? "./mocked-credentials",
      defaultEmojiToSendReactionOnFailureCommand: additionalOptions?.botSettings?.defaultEmojiToSendReactionOnFailureCommand,
      delayMilisecondsBetweenMsgs: additionalOptions?.botSettings?.delayMilisecondsBetweenMsgs ?? 0, // en tests mejor no meter delay real
      enableCommandSafeNet: additionalOptions?.botSettings?.enableCommandSafeNet ?? false,
      ignoreSelfMessage: additionalOptions?.botSettings?.ignoreSelfMessage ?? true,
      loggerMode: additionalOptions?.botSettings?.loggerMode ?? "recommended",
      maxReconnectionRetries: additionalOptions?.botSettings?.maxReconnectionRetries ?? 5,
      ownWhatsSocketImplementation: additionalOptions?.botSettings?.ownWhatsSocketImplementation,
      senderQueueMaxLimit: additionalOptions?.botSettings?.senderQueueMaxLimit ?? 1000,
      sendErrorToChatOnFailureCommand_debug: additionalOptions?.botSettings?.sendErrorToChatOnFailureCommand_debug ?? false,
      tagCharPrefix: additionalOptions?.botSettings?.tagCharPrefix ?? "@",
      timeoutSeconds: additionalOptions?.botSettings?.timeoutSeconds ?? 5, //most test frameworks use this timeout at least
      wrongTypeFeedbackMsg: additionalOptions?.botSettings?.wrongTypeFeedbackMsg ?? "Bot Option: wrongTypeFeedbackMsg mock",
    };

    // ======================
    this._constructorConfig = additionalOptions;
  }

  // Shared message context info for all messages
  private __getBaseMessageContextInfo(): any {
    return {
      deviceListMetadata: {
        senderKeyHash: "qprrpV5KV38MkA==",
        senderTimestamp: "1355194316",
        recipientKeyHash: "4gj7dwAGWE3rWw==",
        recipientTimestamp: "1155394318",
      },
      deviceListMetadataVersion: 2,
      messageSecret: "j+pPQKnytgjeJuMsvrly26TrQQjTFgDauhu2Gy9XsUM=",
    };
  }

  // Base message structure
  private __createBaseMessage(id: string, timestamp: number, pushName: string): WhatsappMessage {
    return {
      key: {
        remoteJid: this._chatIdFromConstructor,
        fromMe: false,
        id: id,
      },
      messageTimestamp: timestamp,
      pushName: pushName,
      broadcast: false,
      message: {},
    };
  }

  // 1. Text Message
  public SimulateSendText(textToEnqueue: string, options?: { customSenderWhatsUsername?: string }): void {
    const timestamp = Date.now() / 1000;
    const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

    const message: WhatsappMessage = this.__createBaseMessage("5AD0EEC1D2649BF2A2EC614714B3ED11", timestamp, pushName);
    message.message = {
      conversation: textToEnqueue,
      ...this.__getBaseMessageContextInfo(),
    };

    this.EnqueuedMsgsFromUser.push({
      rawMsg: message,
      // options: options,
    });
  }

  public async Simulate(): Promise<void> {
    if (this.EnqueuedMsgsFromUser.length > 0) {
      for (const msgObjInfo of this.EnqueuedMsgsFromUser) {
        const sendingMsgPromise = this._mockSocket.MockSendMsgAsync(msgObjInfo.rawMsg);
        const commandRunPromise = this._command.run(
          this._ctx,
          {
            InternalSocket: this._mockSocket,
            Receive: this._receiver,
            Send: this._sender,
          },
          {
            botInfo: {
              Commands: new CommandsSearcher(),
              Settings: this._botOptions, //VARIABLE AMONG MESSAGES
            },
            args: this._constructorConfig?.args ?? [], //VARIABLE AMONG MESSAGES
            chatId: this._chatIdFromConstructor,
            participantId: this._participantIdFromConstructor, //VARIABLE AMONG MESSAGES
            senderType: this._constructorConfig?.senderType ?? SenderType.Individual,
            msgType: this._constructorConfig?.msgType ?? MsgType.Text, // VARIABLE AMONG MESSAGES
            originalRawMsg: this._initialMsgFromConstructor,
            quotedMsgInfo: MsgHelper_ExtractQuotedMsgInfo(msgObjInfo.rawMsg), //VARIABLE AMONG MESSAGES
          }
        );

        await Promise.all([commandRunPromise, sendingMsgPromise]);
      }
    } else {
      await this._command.run(
        this._ctx,
        {
          InternalSocket: this._mockSocket,
          Receive: this._receiver,
          Send: this._sender,
        },
        {
          botInfo: {
            Commands: new CommandsSearcher(),
            Settings: this._botOptions, //VARIABLE AMONG MESSAGES
          },
          args: this._constructorConfig?.args ?? [], //VARIABLE AMONG MESSAGES
          chatId: this._chatIdFromConstructor,
          participantId: this._participantIdFromConstructor, //VARIABLE AMONG MESSAGES
          senderType: this._constructorConfig?.senderType ?? SenderType.Individual,
          msgType: this._constructorConfig?.msgType ?? MsgType.Text, // VARIABLE AMONG MESSAGES
          originalRawMsg: this._initialMsgFromConstructor,
          quotedMsgInfo: null, //VARIABLE AMONG MESSAGES
        }
      );
    }
  }

  // // 2. Text message quoting another previous message
  // public SendTextQuoted(
  //   textToEnqueue: string,
  //   quotedMessageId: string,
  //   quotedParticipant: string,
  //   quotedText: string,
  //   options?: { customSenderWhatsUsername?: string }
  // ): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("945798FC66B8D0C96DB5011C1C27CF7F", timestamp, pushName);
  //   message.message = {
  //     extendedTextMessage: {
  //       text: textToEnqueue,
  //       previewType: "NONE",
  //       contextInfo: {
  //         stanzaId: quotedMessageId,
  //         participant: quotedParticipant,
  //         quotedMessage: {
  //           conversation: quotedText,
  //         },
  //       },
  //       inviteLinkGroupTypeV2: "DEFAULT",
  //       linkPreviewMetadata: {},
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 3. Sticker only message
  // public SendSticker(stickerUrl: string, stickerMimeType: string = "image/webp", options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("32EB3A2601D8D31014FDEEA680ADC3E5", timestamp, pushName);
  //   message.message = {
  //     stickerMessage: {
  //       url: stickerUrl,
  //       fileSha256: "9rkk2EXD7oh09VWP5GUscvah7ut/6ChtZzfnmzh+M3c=",
  //       fileEncSha256: "yNVEVwkQAdMbn3PwGubRTyT8KWQzLLNhXnLcLER3LHU=",
  //       mediaKey: "ka+VsacBelMebMKQD2I9TrjyFbXutsGSJ1/8SNwdti8=",
  //       mimetype: stickerMimeType,
  //       directPath: stickerUrl.split("?")[0],
  //       fileLength: "81868",
  //       mediaKeyTimestamp: timestamp,
  //       isAnimated: false,
  //       stickerSentTs: `${timestamp}306`,
  //       isAvatar: false,
  //       isAiSticker: false,
  //       isLottie: false,
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 4. Image with caption
  // public SendImageWithCaption(imageUrl: string, caption: string, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("4E949425700C337F1ED6DB0CD3F7EAEF", timestamp, pushName);
  //   message.message = {
  //     imageMessage: {
  //       url: imageUrl,
  //       mimetype: "image/jpeg",
  //       caption: caption,
  //       fileSha256: "UVuXNq6sShT2tWh/Q2EMyNgxx8t7saXND6oLC/o5xoo=",
  //       fileLength: "76112",
  //       height: 1077,
  //       width: 720,
  //       mediaKey: "+/9HM7fGzazqtzyiZnK/DTUCUf3taPQLs5atarZi2JY=",
  //       fileEncSha256: "tj8obSDVDxFHi+6dZnAZPTQcDkyW92PKjRZ5+sK8Xl4=",
  //       directPath: imageUrl.split("?")[0],
  //       mediaKeyTimestamp: timestamp - 2,
  //       jpegThumbnail:
  //         "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMALQMBIgACEQEDEQH/xAAuAAACAwEAAAAAAAAAAAAAAAAEBQACAwEBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAN+bDUyWBsDWS1mTK+h4uSt15ehjTZTJ+ZEcicJyqnCcBC0A06FiwdczRZpDSq8m8XJkG1ZK/8QAIxAAAgICAwACAgMAAAAAAAAAAQIAAxExBBIhFFEQQRMiYf/aAAgBAQABPwB+rMesBI3KLakX/YrIxc/bGWkpUCoySYz2KTlzLGpA7ASu7szLuB2sdwzFQDqcb+JOOGaX2MWTp4krrqsQMUEvvXoFAwBKLFSxXwTicjk0mxMJhorFqlA0DGRBWFI/WYtvQAAx60bYEWqstvz6E5wQOAg9E4N/WrDSzBphtavTYh46/ZnxahoGHjVHJI3Dx6gJ/TXcz41LbE7Kf3GKjZmQfQY/pUYzHXsoAQYgfr4dzv7mG0lTn2UXuvhicjDA4jXD0hvYzliTA5ivCQSTEBPoi2bilfsCZikxfUJhJUqo1j8Hc//EABwRAQACAgMBAAAAAAAAAAAAAAEAAhARICFBUf/aAAgBAgEBPwDce8Fh8h94DuIWIkK6yz//xAAdEQACAgEFAAAAAAAAAAAAAAAAAQIRIRASIEFh/9oACAEDAQE/AKFgWHdG1rs80yIkqItxZZKV8P/Z",
  //       contextInfo: {
  //         pairedMediaType: "NOT_PAIRED_MEDIA",
  //       },
  //       scansSidecar: "Q8SSzTEsD/DgKtDv/Os2Nmre7BAkMrjJQr4Q7/3/1vNvVbUDOgCm8Q==",
  //       scanLengths: [8942, 29352, 14499, 23319],
  //       midQualityFileSha256: "74P6z5a8IIIs1fy2AIy3gBy7mG/cnRg0TgsCvw7WcxA=",
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 5. Image only (No caption)
  // public SendImage(imageUrl: string, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("58F17489B6C763B8AD2B50EF042ADE6D", timestamp, pushName);
  //   message.message = {
  //     imageMessage: {
  //       url: imageUrl,
  //       mimetype: "image/jpeg",
  //       caption: "", // Empty caption
  //       fileSha256: "Dk6c/Keb4gGTecu9pVsIJ9/aO7A+gHyt1yjnngzhjAs=",
  //       fileLength: "64162",
  //       height: 1280,
  //       width: 720,
  //       mediaKey: "o8ZrFXnTggvPLyh+Z4UyhtCtFLQytSfKS9XEhESV7B8=",
  //       fileEncSha256: "M03U6Ybae5xpQDDR87vEUFBDP7LT3KzJ4iHPopjhbns=",
  //       directPath: imageUrl.split("?")[0],
  //       mediaKeyTimestamp: timestamp - 1,
  //       jpegThumbnail:
  //         "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIADwAIQMBIgACEQEDEQH/xAAuAAACAwEAAAAAAAAAAAAAAAAABAIDBQEBAAMBAAAAAAAAAAAAAAAAAAECAwD/2gAMAwEAAhADEAAAAFo2dRla5xIkQNnW0rp3zuL30iAAsi+il1KNnNaapAZLG8t8F5DvNrSQjf/EACEQAAICAgEFAQEAAAAAAAAAAAECABEDEiEEECIxQVFh/9oACAEBAAE/AIeBBkViQI3LdgCYUIUzWmBqp9lxcyFyggVQtmdR1KO1KIDYucTRFbYCPkGtX7EbC2xqAUoHZ3iqXj4mAuatXqXBtknTABZkKgRySWW+Jp/TMOarBmDKASIzBvsyMNwROPyLywmBB5NHJFzF5Dnt/8QAHBEAAgMBAAMAAAAAAAAAAAAAAAECESESEBNR/9oACAECAQE/AJTSE7VlkFBsys8c7hTiYOO2i+j1v6f/xAAhEQACAQMDBQAAAAAAAAAAAAABAgADESEQEhMxQVFSgf/aAAgBAwEBPwBabMY6bWtLSoagX7M99BUsMi4E3CofEzFa67T0gHHmcy+s/9k=",
  //       contextInfo: {
  //         pairedMediaType: "NOT_PAIRED_MEDIA",
  //       },
  //       scansSidecar: "/ww0r6jfBpqrQ2Fi1k64F52lHiMdguFYJnkVb9hjhuZ3CBOZkDlVhw==",
  //       scanLengths: [9573, 22231, 11200, 21158],
  //       midQualityFileSha256: "30vNaOvy9O41sLZwAc0KuhlwYM8Ldu7bpUI9FZR9qTQ=",
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 6. Audio message
  // public SendAudio(
  //   audioUrl: string,
  //   audioMimeType: string = "audio/mpeg",
  //   durationSeconds: number = 91,
  //   options?: { customSenderWhatsUsername?: string }
  // ): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("F3CD5F622C7B797490592A90693A5C2E", timestamp, pushName);
  //   message.message = {
  //     audioMessage: {
  //       url: audioUrl,
  //       mimetype: audioMimeType,
  //       fileSha256: "mQzVDVa02HNfhXSWt53ha0mQpT8Hi6ro6OaGBvLgiIE=",
  //       fileLength: "1663497",
  //       seconds: durationSeconds,
  //       ptt: false,
  //       mediaKey: "2UIAIeadVDSJyWj6kpGJFLl1kayLSNtq67n7p2SsWHA=",
  //       fileEncSha256: "kl8f0iyZtU46rdvF6LEd79pCfclkPjQk4cuxPNv7TKA=",
  //       directPath: audioUrl.split("?")[0],
  //       mediaKeyTimestamp: timestamp - 2,
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 7. Video only (No caption)
  // public SendVideo(videoUrl: string, durationSeconds: number = 8, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("9024EEF266409A3E7CB741FEC2BD8D73", timestamp, pushName);
  //   message.message = {
  //     videoMessage: {
  //       url: videoUrl,
  //       mimetype: "video/mp4",
  //       fileSha256: "W2+9gXMnoGx/AAyVYidHyM4tY0BNoseRX9A/D8emBAA=",
  //       fileLength: "578061",
  //       seconds: durationSeconds,
  //       mediaKey: "scjqFItvGJ5btP1nAV5JMtAGRVv0bbnQ92fewAatkNE=",
  //       height: 640,
  //       width: 360,
  //       fileEncSha256: "IKmEvavWbhI475Na/tdhiAp8Y9OYnTZaKv+E07Np0AE=",
  //       directPath: videoUrl.split("?")[0],
  //       mediaKeyTimestamp: timestamp - 1631,
  //       jpegThumbnail:
  //         "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKQMBIgACEQEDEQH/xAAtAAADAQEBAAAAAAAAAAAAAAAAAwQFAgEBAQEBAAAAAAAAAAAAAAAAAAIAAf/aAAwDAQACEAMQAAAA1Y8trLOGynejODPPWKZxWsPJH+adgXmla0aeFmzDllHT9KsurqOnXYdObT0FKtDFNyBv/8QAJxAAAgICAQIGAgMAAAAAAAAAAQIAAwQREiExExQyQVJTFSJhZJH/2gAIAQEAAT8AGRigciwBMsvTlyUlp5q5rdaltS2HbsBOGJR6jueaxPjCykb1EYew6ESknkRMs7cbjWaOu4niJ9SzkAoI6ETmX7d5zPBNHrqZPJkVtQ1vv0meG/xnl7ePolWJYe4IhxTwG5ej11AGeDkN6Qxnlcv63hy2UjlWVhzn2y8BMZ78hWfaqollz3WhLLP133ll1WPicKrQXgyL/tMyshWQholi8R16wWkIUVjpj1EKjtH5b0Juz+ZZYbD3ilQIiO50ojYjp1ZhKLBRax0HnnP66zHxkeouTFxqAg6dYrKHKKPeZNlm+MXZI6zTfI/7MBx6ZfdskAddyqsq3Jo+Mt6D2M/H3L2In4675Cf/xAAbEQEBAAMAAwAAAAAAAAAAAAABABAREgIxgf/aAAgBAgEBPwC8rUN0Lj5c42Ftkn3LdN//xAAbEQADAAIDAAAAAAAAAAAAAAAAARECECFBUf/aAAgBAwEBPwAS5HiMkWo32X3UbIIWof/Z",
  //       contextInfo: {
  //         pairedMediaType: "NOT_PAIRED_MEDIA",
  //       },
  //       streamingSidecar: "fiu8dB6LAMDaC5DsJKAxVJytibkurBRwfALxwY9r3+krJY48wOUU2GNIwxc8YYCQ5Ze4JvhysJpbVq2ldSvILFdcbNvaVQ9MM3LGoIlIUu8qJ0Oy0gpOIYVb",
  //       externalShareFullVideoDurationInSeconds: 0,
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 8. Video with caption
  // public SendVideoWithCaption(videoUrl: string, caption: string, durationSeconds: number = 8, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("F995B41A6A9C009860B2C97AC597EF54", timestamp, pushName);
  //   message.message = {
  //     videoMessage: {
  //       url: videoUrl,
  //       mimetype: "video/mp4",
  //       fileSha256: "W2+9gXMnoGx/AAyVYidHyM4tY0BNoseRX9A/D8emBAA=",
  //       fileLength: "578061",
  //       seconds: durationSeconds,
  //       mediaKey: "scjqFItvGJ5btP1nAV5JMtAGRVv0bbnQ92fewAatkNE=",
  //       caption: caption,
  //       height: 640,
  //       width: 360,
  //       fileEncSha256: "IKmEvavWbhI475Na/tdhiAp8Y9OYnTZaKv+E07Np0AE=",
  //       directPath: videoUrl.split("?")[0],
  //       mediaKeyTimestamp: timestamp - 1631,
  //       jpegThumbnail:
  //         "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKQMBIgACEQEDEQH/xAAtAAADAQEBAAAAAAAAAAAAAAAAAwQFAgEBAQEBAAAAAAAAAAAAAAAAAAIAAf/aAAwDAQACEAMQAAAA1Y8trLOGynejODPPWKZxWsPJH+adgXmla0aeFmzDllHT9KsurqOnXYdObT0FKtDFNyBv/8QAJxAAAgICAQIGAgMAAAAAAAAAAQIAAwQREiExExQyQVJTFSJhZJH/2gAIAQEAAT8AGRigciwBMsvTlyUlp5q5rdaltS2HbsBOGJR6jueaxPjCykb1EYew6ESknkRMs7cbjWaOu4niJ9SzkAoI6ETmX7d5zPBNHrqZPJkVtQ1vv0meG/xnl7ePolWJYe4IhxTwG5ej11AGeDkN6Qxnlcv63hy2UjlWVhzn2y8BMZ78hWfaqollz3WhLLP133ll1WPicKrQXgyL/tMyshWQholi8R16wWkIUVjpj1EKjtH5b0Juz+ZZYbD3ilQIiO50ojYjp1ZhKLBRax0HnnP66zHxkeouTFxqAg6dYrKHKKPeZNlm+MXZI6zTfI/7MBx6ZfdskAddyqsq3Jo+Mt6D2M/H3L2In4675Cf/xAAbEQEBAAMAAwAAAAAAAAAAAAABABAREgIxgf/aAAgBAgEBPwC8rUN0Lj5c42Ftkn3LdN//xAAbEQADAAIDAAAAAAAAAAAAAAAAARECECFBUf/aAAgBAwEBPwAS5HiMkWo32X3UbIIWof/Z",
  //       contextInfo: {
  //         pairedMediaType: "NOT_PAIRED_MEDIA",
  //       },
  //       streamingSidecar: "fiu8dB6LAMDaC5DsJKAxVJytibkurBRwfALxwY9r3+krJY48wOUU2GNIwxc8YYCQ5Ze4JvhysJpbVq2ldSvILFdcbNvaVQ9MM3LGoIlIUu8qJ0Oy0gpOIYVb",
  //       externalShareFullVideoDurationInSeconds: 0,
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 9. Poll with multiple answers allowed
  // public SendPollMultiple(pollName: string, optionsList: string[], options?: { customSenderWhatsUsername?: string; userCanSelectMany?: boolean }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("F1F1C3D54526F8DAB59E34CF364CACEC", timestamp, pushName);
  //   message.message = {
  //     ...this.__getBaseMessageContextInfo(),
  //     pollCreationMessageV3: {
  //       name: pollName,
  //       options: optionsList.map((optionName) => ({ optionName })),
  //       selectableOptionsCount: options?.userCanSelectMany ? optionsList.length : 0, // 0 means multiple selections allowed
  //     },
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 10. Poll with only one answer allowed
  // public SendPollSingle(pollName: string, optionsList: string[], options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("F046E994E342E768E970044D7F5F8A6A", timestamp, pushName);
  //   message.message = {
  //     ...this.__getBaseMessageContextInfo(),
  //     pollCreationMessageV3: {
  //       name: pollName,
  //       options: optionsList.map((optionName) => ({ optionName })),
  //       selectableOptionsCount: 1, // Only one selection allowed
  //     },
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 11. Location message
  // public SendLocation(latitude: number, longitude: number, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const message: WhatsappMessage = this.__createBaseMessage("040DE7E5E6E6165FCFA1AA8E0B140222", timestamp, pushName);
  //   message.message = {
  //     locationMessage: {
  //       degreesLatitude: latitude,
  //       degreesLongitude: longitude,
  //       jpegThumbnail:
  //         "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",
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }

  // // 12. Contact message
  // public SendContact(displayName: string, phoneNumber: string, options?: { customSenderWhatsUsername?: string }): void {
  //   const timestamp = Date.now() / 1000;
  //   const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

  //   const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${displayName};;;\nFN:${displayName}\nTEL;type=Mobile;waid=${phoneNumber}:${phoneNumber}\nEND:VCARD`;

  //   const message: WhatsappMessage = this.__createBaseMessage("618FC565BC8317C756A397BB64723036", timestamp, pushName);
  //   message.message = {
  //     contactMessage: {
  //       displayName: displayName,
  //       vcard: vcard,
  //     },
  //     ...this.__getBaseMessageContextInfo(),
  //   };

  //   this.EnqueuedMsgsFromUser.push({
  //     rawMsg: message,
  //     // options: options,
  //   });
  // }
}

class MockingChat_CustomChatContext extends ChatContext {
  private _mockQueuedMsgs: WhatsappMessage[];

  constructor(
    mockQueuedMsgs: WhatsappMessage[],
    originalSenderID: string | null,
    fixedChatId: string,
    initialMsg: WhatsappMessage,
    senderDependency: WhatsSocket_Submodule_SugarSender,
    receiverDependency: WhatsSocket_Submodule_Receiver,
    config: ChatContextConfig
  ) {
    super(originalSenderID, fixedChatId, initialMsg, senderDependency, receiverDependency, config /**ChatContextConfig*/);
    this._mockQueuedMsgs = mockQueuedMsgs;
  }

  public override async WaitMsg(expectedType: MsgType, localOptions?: Partial<ChatContextConfig>): Promise<WhatsappMessage | null> {
    return super.WaitMsg(expectedType, localOptions);
  }

  // public override SendText(text: string, options?: WhatsMsgSenderSendingOptions): Promise<WhatsappMessage | null> {
  //
  // }
}

// test("How I would like it to be:", async () => {
//   const chat = new MockingChat(new MyCommand());

//   // 1. Enqueued
//   await chat.SendText("This is my first response!", { timeout: 34 });
//   // 2. Enqueued
//   await chat.SendText("My name is chris" /** Optional Partial<ChatContextConfig> object on all Send */);
//   // 3. Enqueued
//   await chat.SendImg(Buffer.from([1, 2, 3, 4]));

//   //Expecting this to not throw errors from inside "MyCommand";
//   await chat.Simulate({
//     customSenderType: SenderType.Group,
//     args: {
//       args: ["arg1", "arg2"],
//     },
//   }); //Like #chat.Start();

//   expect(chat.EnqueuedMsgsFromUser).toHaveLength(0); //All msgs should be consumed by command, if they were 3, it means
//   //command didn't used any of them
// });
