import { type WhatsBotOptions, BotUtils_GenerateOptions } from "../core/bot/bot.js";
import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import CommandsSearcher from "../core/bot/internals/CommandsSearcher.js";
import type { ICommand } from "../core/bot/internals/IBotCommand.js";
import type { IChatContext } from "../core/bot/internals/IChatContext.js";
import type { GroupMetadataInfo } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsSocketMockMsgSent } from "../core/whats_socket/mocks/types.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { ChatContext, MsgType, SenderType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";
import type { WhatsSocketReceiverMsgWaited } from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_SugarSender_MockingSuite from "./WhatsSocket.sugarsender.mockingsuite.js";

export type MockingChatParams = {
  chatContextConfig?: Omit<Partial<ChatContextConfig>, "cancelKeywords">;
  botSettings?: Omit<Partial<WhatsBotOptions>, "cancelKeywords">;
  chatId?: string;
  participantId?: string;
  args?: string[];
  msgType?: MsgType;
  senderType?: SenderType;
  cancelKeywords?: string[];
};

/**
 * MockingChat is a helper utility designed to simulate a full WhatsApp chat session
 * against a given {@link ICommand}.
 *
 * It provides:
 * - Mocked **receiver**, **sender**, and **socket** modules for message flow control.
 * - Facilities to enqueue fake user messages (`SimulateTextSending`).
 * - Accessors to inspect messages that were sent/queued by the command under test.
 * - A fully configured {@link ChatContext} spy object for realistic command execution.
 *
 * Usage:
 * ```ts
 * const mock = new MockingChat(myCommand, { customParticipantId: "12345" });
 * mock.SimulateTextSending("hello");
 * await mock.StartChatSimulation();
 * ```
 */
export default class MockingChat {
  private _constructorConfig?: MockingChatParams;
  private _participantIdFromConstructor?: string;
  private _chatIdFromConstructor: string;
  private _chatContextSpy: IChatContext;
  private _command: ICommand;
  private _receiverMock: WhatsSocket_Submodule_Receiver_MockingSuite;
  private _sugarSenderMock: WhatsSocket_Submodule_SugarSender_MockingSuite;
  private _mockSocket: WhatsSocketMock;

  /**
   * All messages "waited" (consumed) from the mocked receiver.
   * Useful to check what input the command attempted to consume.
   */
  public get WaitedFromCommand(): WhatsSocketReceiverMsgWaited[] {
    return this._receiverMock.Waited;
  }

  /**
   * All messages sent via the sugar-sender mock.
   * These are usually text responses triggered by the command logic.
   */
  public get SentFromCommand() {
    return {
      //From whatssocket_receiver
      Texts: this._sugarSenderMock.SentMessages_Text,
    };
  }

  /**
   * Messages that were sent **through the queue** using the mocked socket.
   * This simulates queued delivery (e.g., internal socket enqueuing).
   */
  public get SentFromCommandSocketQueue(): WhatsSocketMockMsgSent[] {
    return this._mockSocket.SentMessagesThroughQueue;
  }

  /**
   * Messages that were sent **directly without queueing** using the mocked socket.
   * This simulates "raw" delivery. ()
   */
  public get SentFromCommandSocketWithoutQueue(): WhatsSocketMockMsgSent[] {
    return this._mockSocket.SentMessagesThroughRaw;
  }

  /**
   * Creates a new mock chat simulation environment for a given command.
   *
   * @param commandToTest - The {@link ICommand} instance to test.
   * @param additionalOptions - Optional parameters that customize chat setup,
   *   such as `customChatId`, `customParticipantId`, `args`, or `senderType`.
   *
   * Behavior:
   * - If `customParticipantId` is provided, a group chat ID is assumed unless overridden.
   * - Otherwise, defaults to a private one-to-one chat.
   * - Automatically ensures correct WhatsApp LID suffixes for IDs.
   */
  constructor(commandToTest: ICommand, additionalOptions?: MockingChatParams) {
    this._constructorConfig = additionalOptions;
    this._command = commandToTest;

    //GROUP CHAT MSG
    if (additionalOptions?.participantId) {
      if (!additionalOptions?.participantId?.endsWith(WhatsappLIDIdentifier)) {
        this._participantIdFromConstructor = additionalOptions.participantId + WhatsappLIDIdentifier;
      } else {
        this._participantIdFromConstructor = additionalOptions.participantId;
      }
      if (!additionalOptions.chatId) {
        this._chatIdFromConstructor = "fakeChatIdGroup" + WhatsappGroupIdentifier;
      } else {
        if (!additionalOptions.chatId.endsWith(WhatsappGroupIdentifier)) {
          this._chatIdFromConstructor = additionalOptions.chatId + WhatsappGroupIdentifier;
        } else {
          this._chatIdFromConstructor = additionalOptions.chatId;
        }
      }
      //INDIVIDUAL MSG
    } else {
      // this._participantIdFromConstructor;
      if (!additionalOptions?.chatId) {
        this._chatIdFromConstructor = "fakePrivateChatWithUserId" + WhatsappIndividualIdentifier;
      } else {
        if (!additionalOptions.chatId.endsWith(WhatsappIndividualIdentifier)) {
          this._chatIdFromConstructor = additionalOptions.chatId + WhatsappIndividualIdentifier;
        } else {
          this._chatIdFromConstructor = additionalOptions.chatId;
        }
      }
    }

    const chatContextConfig: ChatContextConfig = {
      cancelKeywords: this._constructorConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: this._constructorConfig?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: this._constructorConfig?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
      customSenderType_Internal: additionalOptions?.senderType,
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

  /**
   * Simulates the sending of a text message into the mocked chat.
   * This enqueues the message into the mocked receiver, making it
   * available for the command to "consume" during execution.
   *
   * @param textToEnqueue - The message content to simulate.
   * @param options - Allows overriding the sender pushName (WhatsApp display name).
   */
  @autobind
  public EnqueueIncomingText(textToEnqueue: string, options?: { customSenderWhatsUsername?: string }): void {
    const txtMsg: WhatsappMessage = this._createTxtMsg(textToEnqueue, { customSenderWhatsUsername: options?.customSenderWhatsUsername });
    this._receiverMock.AddWaitMsg({ rawMsg: txtMsg });
  }

  /**
   * Starts the simulation by executing the command under test with the mocked context
   * and sending all queued msgs with this class EnqueueIncoming*() methods.
   *
   * Use it to start your test with your command
   *
   * This method:
   * - Creates a fake invocation of the command (`!commandName`).
   * - Injects mocked sender/receiver/socket modules into the execution context.
   * - Runs the command's `run` method as if in a real bot environment.
   */
  @autobind
  public async StartChatSimulation(): Promise<void> {
    // const receiver: WhatsSocket_Submodule_Receiver = new WhatsSocket_Submodule_Receiver();
    //Need to conver
    await this._command.run(
      this._chatContextSpy,
      {
        // @deprecated: InternalSocket already contains Receive and Send objects
        // Receive: this._receiverMock,
        // Send: this._sugarSenderMock, //How to connect with InternalSocket??
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
        senderType: this._constructorConfig?.senderType ?? (this._participantIdFromConstructor ? SenderType.Group : SenderType.Individual),
      }
    );
  }

  @autobind
  public SetGroupMetadataMock(metadata: Partial<GroupMetadataInfo>) {
    const actualSenderType = this._constructorConfig?.senderType ?? (this._participantIdFromConstructor ? SenderType.Group : SenderType.Individual);
    if (metadata.id) {
      let newChatId: string;
      if (actualSenderType === SenderType.Group) {
        if (!metadata.id.endsWith(WhatsappGroupIdentifier)) {
          newChatId = metadata.id + WhatsappGroupIdentifier;
        } else {
          newChatId = metadata.id;
        }
      } else {
        if (!metadata.id.endsWith(WhatsappIndividualIdentifier)) {
          newChatId = metadata.id + WhatsappIndividualIdentifier;
        } else {
          newChatId = metadata.id;
        }
      }
      this._chatIdFromConstructor = newChatId;
    }
    //@ts-expect-error just a little fix... jejeje
    this._chatContextSpy["FixedChatId"] = this._chatIdFromConstructor;
    this._receiverMock.SetGroupMetadataMock({ ...metadata, id: this._chatIdFromConstructor });
    //With mocksocket, do not modify it, its always group
    this._mockSocket.SetGroupMetadataMock(metadata);
  }

  @autobind
  public ClearMocks(): void {
    this._receiverMock.ClearMocks();
    this._sugarSenderMock.ClearMocks();
    this._mockSocket.ClearMock();
  }

  //#region Private Utils
  /**
   * Creates the minimal base structure of a WhatsApp message object.
   *
   * @param id - Message unique identifier.
   * @param timestamp - Unix timestamp (seconds).
   * @param pushName - Display name of the sender.
   * @returns A partially filled {@link WhatsappMessage}.
   */
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

  /**
   * Creates a fake WhatsApp text message.
   *
   * @param textToIncludeInMsg - The text content of the message.
   * @param options - Allows overriding the sender pushName (WhatsApp display name).
   * @returns A complete {@link WhatsappMessage} with conversation text set.
   */
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
  //#endregion
}
