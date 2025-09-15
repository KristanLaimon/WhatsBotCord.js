import { type WhatsBotOptions, BotUtils_GenerateOptions } from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import CommandsSearcher from "../core/bot/internals/CommandsSearcher.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { ChatContext, MsgType, SenderType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../Whatsapp.types.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_SugarSender_MockingSuite from "./WhatsSocket.sugarsender.mockingsuite.js";

export type MockingChatParams = {
  chatContextConfig?: Omit<Partial<ChatContextConfig>, "cancelKeywords">;
  botSettings?: Omit<Partial<WhatsBotOptions>, "cancelKeywords">;
  customChatId?: string;
  customParticipantId?: string;
  args?: string[];
  msgType?: MsgType;
  customSenderType?: SenderType;
  cancelKeywords?: string[];
};

export default class MockingChat {
  private _constructorConfig?: MockingChatParams;
  private _participantIdFromConstructor?: string;
  private _chatIdFromConstructor: string;
  private _chatContextSpy: IChatContext;
  private _command: ICommand;
  private _receiverMock: WhatsSocket_Submodule_Receiver_MockingSuite;
  private _sugarSenderMock: WhatsSocket_Submodule_SugarSender_MockingSuite;
  private _mockSocket: WhatsSocketMock;

  public get WaitedFromCommand() {
    return {
      //From whatssocket_sugarsender
      Texts: this._receiverMock.Waited_Text,
    };
  }

  public get SentFromCommand() {
    return {
      //From whatssocket_receiver
      Texts: this._sugarSenderMock.SentMessages_Text,
    };
  }

  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    this._command = commandToTest;

    this._participantIdFromConstructor = additionalOptions?.customParticipantId;
    //Explanation:
    //If msg comes with customParticipantId (that's how whatsapp works),
    //it means it MUST come from a group chat, so lets use a group chat by default if
    //dev didn't provided
    if (additionalOptions?.customParticipantId && !additionalOptions.customChatId) {
      this._chatIdFromConstructor = "fakeChatIdGroup" + WhatsappGroupIdentifier;
    } else {
      //Otherwise, if dev provided a customChatId, use it, otherwise, treat this as an individual chat
      this._chatIdFromConstructor = additionalOptions?.customChatId ?? "fakeChatIdFromUser" + WhatsappIndividualIdentifier;
    }
    this._constructorConfig = additionalOptions;

    // 1. ============== Chat creation (to be able to store all msgs sent) ====================
    const chatContextConfig: ChatContextConfig = {
      cancelKeywords: this._constructorConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: this._constructorConfig?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: this._constructorConfig?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
      customSenderType_Internal: additionalOptions?.customSenderType,
    };
    this._receiverMock = new WhatsSocket_Submodule_Receiver_MockingSuite();
    this._sugarSenderMock = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    this._mockSocket = new WhatsSocketMock({ customReceiver: this._receiverMock, customSugarSender: this._sugarSenderMock });
    const chatContext = new ChatContext(
      this._participantIdFromConstructor ?? null,
      this._chatIdFromConstructor,
      this._createTxtMsg(`!${this._command.name}`),
      this._sugarSenderMock,
      this._receiverMock,
      chatContextConfig
    );
    this._chatContextSpy = chatContext;
  }

  @autobind
  public SendText(textToEnqueue: string, options?: { customSenderWhatsUsername?: string }): void {
    const txtMsg: WhatsappMessage = this._createTxtMsg(textToEnqueue, { customSenderWhatsUsername: options?.customSenderWhatsUsername });
    this._receiverMock.AddWaitMsg({ rawMsg: txtMsg });
  }

  @autobind
  public async StartChatSimulation(): Promise<void> {
    // const receiver: WhatsSocket_Submodule_Receiver = new WhatsSocket_Submodule_Receiver();
    //Need to conver
    await this._command.run(
      this._chatContextSpy,
      {
        Receive: this._receiverMock,
        Send: this._sugarSenderMock, //How to connect with InternalSocket??
        InternalSocket: this._mockSocket,
      },
      {
        args: this._constructorConfig?.args ?? [],
        botInfo: {
          Commands: new CommandsSearcher(),
          Settings: BotUtils_GenerateOptions({ ...this._constructorConfig?.botSettings, cancelKeywords: this._chatContextSpy.Config.cancelKeywords }),
        },
        chatId: this._chatIdFromConstructor,
        participantId: this._participantIdFromConstructor ?? null,
        msgType: this._constructorConfig?.msgType ?? MsgType.Text,
        originalRawMsg: {} as any,
        quotedMsgInfo: {} as any,
        senderType: this._constructorConfig?.customSenderType ?? (this._participantIdFromConstructor ? SenderType.Group : SenderType.Individual),
      }
    );
  }

  @autobind
  private __createBaseMessage(id: string, timestamp: number, pushName: string): WhatsappMessage {
    return {
      key: {
        remoteJid: this._chatIdFromConstructor,
        participant: this._participantIdFromConstructor,
        fromMe: false,
        id: id,
      },
      messageTimestamp: timestamp,
      pushName: pushName,
      broadcast: false,
      message: {},
      deviceListMetadata: {
        senderKeyHash: "qprrpV5KV38MkA==",
        senderTimestamp: "1355194316",
        recipientKeyHash: "4gj7dwAGWE3rWw==",
        recipientTimestamp: "1155394318",
      },
      deviceListMetadataVersion: 2,
      //@ts-expect-error this is string for sure, ts is annoying with this
      messageSecret: "j+pPQKnytgjeJuMsvrly26TrQQjTFgDauhu2Gy9XsUM=",
    };
  }

  @autobind
  private _createTxtMsg(textToIncludeInMsg: string, options?: { customSenderWhatsUsername?: string }): WhatsappMessage {
    const timestamp = Math.floor(Date.now() / 1000);
    const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg (mock response)";

    const message: WhatsappMessage = this.__createBaseMessage("5AD0EEC1D2649BF2A2EC614714B3ED11", timestamp, pushName);
    message.message = {
      conversation: textToIncludeInMsg,
    };
    return message;
  }
}
