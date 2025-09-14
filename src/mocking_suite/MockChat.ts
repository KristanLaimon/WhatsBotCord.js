import { type WhatsBotOptions, BotUtils_GenerateOptions } from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import CommandsSearcher from "../core/bot/internals/CommandsSearcher.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { MsgType, SenderType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";
import ChatContextSpy, { type ChatContextSpyWhatsMsg } from "./ChatContextSpy.js";

export type MockingChatParams = {
  chatContextConfig?: Omit<Partial<ChatContextConfig>, "cancelKeywords">;
  botSettings?: Omit<Partial<WhatsBotOptions>, "cancelKeywords">;
  customChatId?: string;
  customParticipantId?: string;
  args?: string[];
  msgType?: MsgType;
  senderType?: SenderType;
  cancelKeywords?: string[];
};

export default class MockingChat {
  public EnqueuedMsgsFromUser: ChatContextSpyWhatsMsg[] = [];

  private _constructorConfig?: MockingChatParams;
  private _participantIdFromConstructor: string;
  private _chatIdFromConstructor: string;
  private _chatContextSpy: ChatContextSpy;
  private _command: ICommand;

  public get SentFromCommand() {
    return {
      Texts: this._chatContextSpy.SentMessages_Text,
    };
  }

  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    // Initialize participant and chat IDs
    this._command = commandToTest;
    this._participantIdFromConstructor = additionalOptions?.customParticipantId ?? "fakeUserLidOnGroupOnly" + WhatsappLIDIdentifier;
    this._chatIdFromConstructor = additionalOptions?.customChatId ?? "fakeChatId" + WhatsappGroupIdentifier;
    this._constructorConfig = additionalOptions;

    // 2. ============== Chat context spy creation (to be able to store all msgs sent) ====================
    const chatContextConfig: ChatContextConfig = {
      cancelKeywords: this._constructorConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: this._constructorConfig?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: this._constructorConfig?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
    };

    this._chatContextSpy = new ChatContextSpy(
      this.EnqueuedMsgsFromUser,
      this._participantIdFromConstructor,
      this._chatIdFromConstructor,
      additionalOptions?.senderType ?? SenderType.Individual,
      chatContextConfig
    );
  }

  @autobind
  public SendText(textToEnqueue: string, options?: { customSenderWhatsUsername?: string }): void {
    const timestamp = Math.floor(Date.now() / 1000);
    const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg (mock response)";

    const message: WhatsappMessage = this.__createBaseMessage("5AD0EEC1D2649BF2A2EC614714B3ED11", timestamp, pushName);
    message.message = {
      conversation: textToEnqueue,
    };

    this.EnqueuedMsgsFromUser.push({
      rawMsg: message,
    });
  }

  @autobind
  public async Simulate(): Promise<void> {
    // const receiver: WhatsSocket_Submodule_Receiver = new WhatsSocket_Submodule_Receiver();
    //Need to conver
    //TODO: Need to convert WhatsSocket_Submodule_Receiver into an interface and mock it here
    //TODO: Need to convert WhatsSocket_Submodule_SugarSender into an interface and mock it here
    await this._command.run(
      this._chatContextSpy,
      //TODO: How to mock receive and send to align with SentFromCommadn get() prop from this class??
      {
        // Receive: {}, // pending to mock and use instead chatconfig!
        // Sending: {}, // pendin to mock and use instead chatconfig!
      } as any,
      {
        args: this._constructorConfig?.args ?? [],
        botInfo: {
          Commands: new CommandsSearcher(),
          Settings: BotUtils_GenerateOptions({ ...this._constructorConfig?.botSettings, cancelKeywords: this._chatContextSpy.Config.cancelKeywords }),
        },
        chatId: this._chatIdFromConstructor,
        participantId: this._participantIdFromConstructor,
        msgType: this._constructorConfig?.msgType ?? MsgType.Text,
        originalRawMsg: {} as any,
        quotedMsgInfo: {} as any,
        senderType: this._constructorConfig?.senderType ?? (this._participantIdFromConstructor ? SenderType.Group : SenderType.Individual),
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
}
