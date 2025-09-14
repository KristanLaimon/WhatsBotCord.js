import type { WhatsBotOptions } from "../core/bot/bot.js";
import Bot from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { WhatsSocketMockOptions } from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { type MsgType, type SenderType, CommandType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";
import ChatContextSpy from "./ChatContextSpy.js";

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
  private _constructorConfig?: MockingChatParams;
  private _participantIdFromConstructor: string;
  private _chatIdFromConstructor: string;
  private _triggerCommand: WhatsappMessage;
  private _chatContextSpy: ChatContextSpy;

  public get SentFromCommand() {
    return {
      Texts: this._chatContextSpy.SentFromCommand_Texts,
    };
  }

  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    // Initialize participant and chat IDs
    this._participantIdFromConstructor = additionalOptions?.customParticipantId ?? "fakeUserLidOnGroupOnly" + WhatsappLIDIdentifier;
    this._chatIdFromConstructor = additionalOptions?.customChatId ?? "fakeChatId" + WhatsappGroupIdentifier;
    const defaultSocketOptions: WhatsSocketMockOptions = {
      minimumMilisecondsDelayBetweenMsgs: additionalOptions?.internalMessagingOptions?.minimumMilisecondsDelayBetweenMsgs ?? 1,
      maxQueueLimit: additionalOptions?.internalMessagingOptions?.maxQueueLimit ?? 1000,
    };
    this._mockSocket = new WhatsSocketMock(defaultSocketOptions);
    this._command = commandToTest;
    this._constructorConfig = additionalOptions;
    this._bot = new Bot({ ...additionalOptions?.botSettings, ownWhatsSocketImplementation_Internal: this._mockSocket });
    this._bot.Commands.Add(commandToTest, CommandType.Normal);
    this._bot.Settings.enableCommandSafeNet = false;
    this._bot.Start(); //to initialize itself

    // 1. ============== Trigger command ====================
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
      pushName: "Test User (This msg is sent by mocking framework, to trigger your command so it can simulate a production environment, ignore this",
      broadcast: false,
    };
    this._triggerCommand = triggerMsg;

    // 2. ============== Chat context spy creation (to be able to store all msgs sent) ====================
    const chatContextConfig: ChatContextConfig = {
      cancelKeywords: this._constructorConfig?.chatContextConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: this._constructorConfig?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: this._constructorConfig?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
    };

    this._chatContextSpy = new ChatContextSpy(
      this._participantIdFromConstructor,
      this._chatIdFromConstructor,
      triggerMsg,
      this._bot.SendMsg,
      this._bot.ReceiveMsg,
      chatContextConfig
    );

    this._bot.Settings.ownChatContextCreationHook_Internal = () => this._chatContextSpy;
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
    // Send the trigger command and wait for it to start processing
    const command = this._mockSocket.MockSendMsgAsync(this._triggerCommand);
    await new Promise<void>((resolve) => setTimeout(resolve, 10)); // Small delay to let command start

    // Send enqueued user messages sequentially
    if (this.EnqueuedMsgsFromUser.length > 0) {
      for (const msgObjInfo of this.EnqueuedMsgsFromUser) {
        await this._mockSocket.MockSendMsgAsync(msgObjInfo.rawMsg); // Await each message
      }
    }

    // Wait for command execution and all promises to resolve
    await Promise.all([command, this._chatContextSpy.ExecuteAllInOrder()]);
    this.EnqueuedMsgsFromUser = [];
  }
}
