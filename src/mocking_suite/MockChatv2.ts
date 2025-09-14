import type { WhatsBotOptions } from "../core/bot/bot.js";
import Bot from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { WhatsSocketMockOptions } from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { type MsgType, type SenderType, CommandType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";

export type MockingChatParams = {
  internalMessagingOptions?: WhatsSocketMockOptions;
  chatContextConfig?: Partial<ChatContextConfig>;
  botSettings?: Partial<WhatsBotOptions>;
  customChatId?: string;
  customParticipantId?: string;
  args?: string[];
  msgType?: MsgType;
  senderType?: SenderType;
};

export type MockingChatMsgToSend = {
  rawMsg: WhatsappMessage;
};

export default class MockingChat {
  public EnqueuedMsgsFromUser: MockingChatMsgToSend[] = [];

  private _bot: Bot;
  private _command: ICommand;
  private _mockSocket: WhatsSocketMock;
  // private _receiver: WhatsSocket_Submodule_Receiver;
  // private _sender: WhatsSocket_Submodule_SugarSender;
  private _botOptions: WhatsBotOptions;
  private _constructorConfig?: MockingChatParams;
  private _participantIdFromConstructor: string;
  private _chatIdFromConstructor: string;
  private _initialMsgFromConstructor: WhatsappMessage;
  // private _ctx: ChatContext;

  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    // Initialize participant and chat IDs
    this._participantIdFromConstructor = additionalOptions?.customParticipantId ?? "fakeUserLidOnGroupOnly" + WhatsappLIDIdentifier;
    this._chatIdFromConstructor = additionalOptions?.customChatId ?? "fakeChatId" + WhatsappGroupIdentifier;

    // Initialize initial mock message
    this._initialMsgFromConstructor = {
      key: {
        fromMe: false,
        participant: this._participantIdFromConstructor,
        remoteJid: this._chatIdFromConstructor,
        id: "Whatsbotcord_==idMessageMock==",
      },
      message: {
        conversation: additionalOptions?.args ? `!${commandToTest.name} ${additionalOptions.args.join(" ")}` : `!${commandToTest.name}`,
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: "User Who Sends this msg",
      broadcast: false,
    };

    // Initialize socket options
    const defaultSocketOptions: WhatsSocketMockOptions = {
      minimumMilisecondsDelayBetweenMsgs: additionalOptions?.internalMessagingOptions?.minimumMilisecondsDelayBetweenMsgs ?? 1,
      maxQueueLimit: additionalOptions?.internalMessagingOptions?.maxQueueLimit ?? 1000,
    };

    // Initialize bot options
    this._botOptions = {
      cancelFeedbackMsg: additionalOptions?.botSettings?.cancelFeedbackMsg ?? "Bot Option: cancelFeedbackMsg mock",
      cancelKeywords: additionalOptions?.botSettings?.cancelKeywords ?? ["cancel"],
      commandPrefix: additionalOptions?.botSettings?.commandPrefix ?? "!",
      credentialsFolder: additionalOptions?.botSettings?.credentialsFolder ?? "./mocked-credentials",
      defaultEmojiToSendReactionOnFailureCommand: additionalOptions?.botSettings?.defaultEmojiToSendReactionOnFailureCommand,
      delayMilisecondsBetweenMsgs: additionalOptions?.botSettings?.delayMilisecondsBetweenMsgs ?? 1,
      enableCommandSafeNet: additionalOptions?.botSettings?.enableCommandSafeNet ?? false,
      ignoreSelfMessage: additionalOptions?.botSettings?.ignoreSelfMessage ?? true,
      loggerMode: additionalOptions?.botSettings?.loggerMode ?? "recommended",
      maxReconnectionRetries: additionalOptions?.botSettings?.maxReconnectionRetries ?? 5,
      ownWhatsSocketImplementation: additionalOptions?.botSettings?.ownWhatsSocketImplementation,
      senderQueueMaxLimit: additionalOptions?.botSettings?.senderQueueMaxLimit ?? 1000,
      sendErrorToChatOnFailureCommand_debug: additionalOptions?.botSettings?.sendErrorToChatOnFailureCommand_debug ?? false,
      tagCharPrefix: additionalOptions?.botSettings?.tagCharPrefix ?? "@",
      timeoutSeconds: additionalOptions?.botSettings?.timeoutSeconds ?? 5,
      wrongTypeFeedbackMsg: additionalOptions?.botSettings?.wrongTypeFeedbackMsg ?? "Bot Option: wrongTypeFeedbackMsg mock",
    };

    // Initialize dependencies
    this._mockSocket = new WhatsSocketMock(defaultSocketOptions);
    // this._receiver = new WhatsSocket_Submodule_Receiver(this._mockSocket);
    // this._sender = new WhatsSocket_Submodule_SugarSender(this._mockSocket);
    /**this._ctx*/
    // const ctx = new ChatContext(
    //   this._participantIdFromConstructor,
    //   this._chatIdFromConstructor,
    //   this._initialMsgFromConstructor,
    //   this._sender,
    //   this._receiver,
    //   {
    //     cancelKeywords: additionalOptions?.chatContextConfig?.cancelKeywords ?? ["cancel"],
    //     ignoreSelfMessages: additionalOptions?.chatContextConfig?.ignoreSelfMessages ?? true,
    //     timeoutSeconds: additionalOptions?.chatContextConfig?.timeoutSeconds ?? 15,
    //     cancelFeedbackMsg:
    //       additionalOptions?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
    //     wrongTypeFeedbackMsg:
    //       additionalOptions?.chatContextConfig?.wrongTypeFeedbackMsg ??
    //       "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
    //   }
    // );

    // Initialize Bot and register command
    this._command = commandToTest;
    this._constructorConfig = additionalOptions;
    this._bot = new Bot({ ...this._botOptions, ownWhatsSocketImplementation: this._mockSocket });
    this._bot.Commands.Add(commandToTest, CommandType.Normal);
    // Start the bot to initialize socket and listeners
    this._bot.Start();
  }

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
    };
  }

  public SendText(textToEnqueue: string, options?: { customSenderWhatsUsername?: string }): void {
    const timestamp = Math.floor(Date.now() / 1000);
    const pushName = options?.customSenderWhatsUsername ?? "User Who Sends this msg";

    const message: WhatsappMessage = this.__createBaseMessage("5AD0EEC1D2649BF2A2EC614714B3ED11", timestamp, pushName);
    message.message = {
      conversation: textToEnqueue,
      ...this.__getBaseMessageContextInfo(),
    };

    this.EnqueuedMsgsFromUser.push({
      rawMsg: message,
    });
  }

  public async Simulate(): Promise<void> {
    // 1. Trigger command
    const prefix: string =
      typeof this._bot.Settings.commandPrefix === "string" ? this._bot.Settings.commandPrefix : this._bot.Settings.commandPrefix?.at(0) ?? "!";

    const commandName: string = this._command.name.toLowerCase();
    const argsJoined: string | null = this._constructorConfig?.args ? this._constructorConfig.args.join(" ") : null;

    const triggerCommandText: string = prefix + commandName + (argsJoined ? " " + argsJoined : "");

    const triggerMsg: WhatsappMessage = {
      key: {
        fromMe: false,
        participant: this._participantIdFromConstructor,
        remoteJid: this._chatIdFromConstructor,
        id: "trigger_" + Date.now(),
      },
      message: { conversation: triggerCommandText },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: "Test User",
      broadcast: false,
    };

    const fullCommandPromise: Promise<void> = this._mockSocket.MockSendMsgAsync(triggerMsg);
    await new Promise<void>((r) => setTimeout(r, 10));
    // 2. Replay enqueued test messages as-is
    for (const msgObjInfo of this.EnqueuedMsgsFromUser) {
      await this._mockSocket.MockSendMsgAsync(msgObjInfo.rawMsg);
    }

    await fullCommandPromise;
    this.EnqueuedMsgsFromUser = [];
  }
}
