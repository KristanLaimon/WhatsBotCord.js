import mime from "mime";
import path from "node:path";
import { type WhatsBotOptions, BotUtils_GenerateOptions } from "../core/bot/bot.js";
import type { IChatContextConfig } from "../core/bot/internals/ChatContext.js";
import Myself_Submodule_Status from "../core/bot/internals/ChatContext.myself.status.js";
import CommandsSearcher from "../core/bot/internals/CommandsSearcher.js";
import type { ICommand } from "../core/bot/internals/ICommand.js";
import type { GroupMetadataInfo } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsSocketMockMsgSent } from "../core/whats_socket/mocks/types.js";
import WhatsSocketMock from "../core/whats_socket/mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { ChatContext, MsgType, SenderType } from "../index.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../Whatsapp.types.js";
import ChatContext_MockingSuite from "./ChatContext.mockingsuite.js";
import {
  MsgFactory_Audio,
  MsgFactory_Contact,
  MsgFactory_Document,
  MsgFactory_Image,
  MsgFactory_Location,
  MsgFactory_Sticker,
  MsgFactory_Text,
  MsgFactory_Video,
} from "./MsgsMockFactory.js";
import type { WhatsSocketReceiverMsgWaited } from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./WhatsSocket.receiver.mockingsuite.js";
import WhatsSocket_Submodule_SugarSender_MockingSuite from "./WhatsSocket.sugarsender.mockingsuite.js";

export type MockingChatParams = {
  chatContextConfig?: Omit<Partial<IChatContextConfig>, "cancelKeywords">;
  botSettings?: Omit<Partial<WhatsBotOptions>, "cancelKeywords">;
  chatId?: string;
  participantId_LID?: string | null;
  participantId_PN?: string | null;
  args?: string[];
  msgType?: MsgType;
  senderType?: SenderType;
  cancelKeywords?: string[];
};

export type MockEnqueueParamsMinimal = { pushName?: string; delayMilisecondsToReponse?: number };
export type MockEnqueueParamsMultimediaMinimal = MockEnqueueParamsMinimal & { bufferToReturnOn_WaitMultimedia?: Buffer };
export type MockEnqueueParamsMultimedia = MockEnqueueParamsMultimediaMinimal & { caption?: string };
export type MockEnqueueParamsDocument = MockEnqueueParamsMultimediaMinimal & { mimeType?: string };
export type MockEnqueueParamsLocation = MockEnqueueParamsMinimal & { locationName?: string; addressDescription?: string };

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
export default class ChatMock {
  public readonly ParticipantId_LID: string | null;
  public readonly ParticipantId_PN: string | null;
  public readonly ChatId: string;

  private readonly _senderType: SenderType;
  private _constructorConfig?: MockingChatParams;
  private _chatContextMock: ChatContext_MockingSuite;
  private _command: ICommand;
  private _receiverMock: WhatsSocket_Submodule_Receiver_MockingSuite;
  private _sugarSenderMock: WhatsSocket_Submodule_SugarSender_MockingSuite;
  private _socketMock: WhatsSocketMock;

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
      Texts: this._sugarSenderMock.SentMessages_Texts,
      Images: this._sugarSenderMock.SentMessages_Imgs,
      ReactedEmojis: this._sugarSenderMock.SentMessages_ReactedEmojis,
      Stickers: this._sugarSenderMock.SentMessages_Stickers,
      Audios: this._sugarSenderMock.SentMessages_Audios,
      Videos: this._sugarSenderMock.SentMessages_Videos,
      Documents: this._sugarSenderMock.SentMessages_Documents,
      Polls: this._sugarSenderMock.SentMessages_Polls,
      Locations: this._sugarSenderMock.SentMessages_Locations,
      Contacts: this._sugarSenderMock.SentMessages_Contacts,
    };
  }

  /**
   * Messages that were sent **through the queue** using the mocked socket.
   * This simulates queued delivery (e.g., internal socket enqueuing).
   */
  public get SentFromCommandSocketQueue(): WhatsSocketMockMsgSent[] {
    return this._socketMock.SentMessagesThroughQueue;
  }

  /**
   * Messages that were sent **directly without queueing** using the mocked socket.
   * This simulates "raw" delivery. ()
   */
  public get SentFromCommandSocketWithoutQueue(): WhatsSocketMockMsgSent[] {
    return this._socketMock.SentMessagesThroughRaw;
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

    // const senderTypeToMock: SenderType = additionalOptions?.senderType ?? SenderType.Individual;
    const senderTypeToMock: SenderType = additionalOptions?.senderType ?? SenderType.Individual;
    this._senderType = senderTypeToMock;
    const { chatIdResolved, updatedSenderType: resolveChatIdFoundSenderType } = Constructor_ResolveChatID(additionalOptions?.chatId, this._senderType);
    this.ChatId = chatIdResolved;
    if (resolveChatIdFoundSenderType) this._senderType = resolveChatIdFoundSenderType;

    const {
      LID,
      PN,
      senderTypeUpdated: resolveParticipantsFoundSenderType,
    } = Constructor_ResolveParticipantIds(additionalOptions?.participantId_LID, additionalOptions?.participantId_PN, this._senderType);
    if (resolveParticipantsFoundSenderType) this._senderType = resolveParticipantsFoundSenderType;

    this.ParticipantId_LID = LID;
    this.ParticipantId_PN = PN;
    if (additionalOptions?.senderType) this._senderType = additionalOptions?.senderType;

    const chatContextConfig: IChatContextConfig = {
      cancelKeywords: this._constructorConfig?.cancelKeywords ?? ["cancel"],
      ignoreSelfMessages: this._constructorConfig?.chatContextConfig?.ignoreSelfMessages ?? true,
      timeoutSeconds: this._constructorConfig?.chatContextConfig?.timeoutSeconds ?? 15,
      cancelFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.cancelFeedbackMsg ?? "Default cancel message mocking, user has canceled this command with a cancel word",
      wrongTypeFeedbackMsg:
        this._constructorConfig?.chatContextConfig?.wrongTypeFeedbackMsg ??
        "Default wrong expected type message, user has sent a msg which doesn't correspond to expected WaitMsg from command...",
      explicitSenderType: this._senderType,
    };
    this._receiverMock = new WhatsSocket_Submodule_Receiver_MockingSuite();
    this._sugarSenderMock = new WhatsSocket_Submodule_SugarSender_MockingSuite();
    this._socketMock = new WhatsSocketMock({ customReceiver: this._receiverMock, customSugarSender: this._sugarSenderMock });
    const chatContext = new ChatContext_MockingSuite(
      this.ParticipantId_LID,
      this.ParticipantId_PN,
      this.ChatId,
      MsgFactory_Text(this.ChatId, this.ParticipantId_LID, `!${this._command.name}`, { pushName: "ChatMock User" }),
      this._sugarSenderMock,
      this._receiverMock,
      chatContextConfig
    );
    this._chatContextMock = chatContext;
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
  public EnqueueIncoming_Text(textToEnqueue: string, options?: MockEnqueueParamsMinimal): void {
    const txtMsg: WhatsappMessage = MsgFactory_Text(this.ChatId, this.ParticipantId_LID, textToEnqueue, {
      pushName: options?.pushName,
    });
    this._receiverMock.AddWaitMsg({ rawMsg: txtMsg, milisecondsDelayToRespondMock: options?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of an image message into the mocked chat.
   * The message is enqueued into the mocked receiver and can be consumed
   * by the command under test.
   *
   * If a `bufferToReturnOnWaitMultimedia` is provided, it will override
   * the buffer returned by {@link ChatContext.WaitMultimedia}.
   *
   * @param imgUrl - URL of the image to simulate.
   * @param opts - Optional parameters such as caption, sender pushName,
   *   and an optional mock buffer for multimedia retrieval.
   */
  @autobind
  public EnqueueIncoming_Img(imgUrl: string, opts?: MockEnqueueParamsMultimedia): void {
    const imgMsg: WhatsappMessage = MsgFactory_Image(this.ChatId, this.ParticipantId_LID, imgUrl, {
      caption: opts?.caption,
      pushName: opts?.pushName,
    });
    if (opts?.bufferToReturnOn_WaitMultimedia) {
      this._chatContextMock.EnqueueMediaBufferToReturn(opts.bufferToReturnOn_WaitMultimedia);
    }
    this._receiverMock.AddWaitMsg({ rawMsg: imgMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of a sticker message into the mocked chat.
   * Enqueues the message into the mocked receiver for the command to
   * consume.
   *
   * If a `bufferToReturnOnWaitMultimedia` is set, that buffer will be
   * returned during multimedia waits instead of performing a real
   * download.
   *
   * @param urlSticker - URL of the sticker file (usually `.webp`).
   * @param opts - Optional parameters like pushName and a mock buffer.
   */
  @autobind
  public EnqueueIncoming_Sticker(urlSticker: string, opts?: MockEnqueueParamsMultimediaMinimal): void {
    const stickerMsg: WhatsappMessage = MsgFactory_Sticker(this.ChatId, this.ParticipantId_LID, urlSticker, {
      pushName: opts?.pushName,
    });
    if (opts?.bufferToReturnOn_WaitMultimedia) {
      this._chatContextMock.EnqueueMediaBufferToReturn(opts.bufferToReturnOn_WaitMultimedia);
    }
    this._receiverMock.AddWaitMsg({ rawMsg: stickerMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of an audio message into the mocked chat.
   * The message is added to the mocked receiver queue.
   *
   * If a mock buffer is provided, it will be used when awaiting
   * multimedia content via {@link WaitMultimedia}.
   *
   * @param urlaudio - URL of the audio file to simulate.
   * @param opts - Optional pushName and buffer override.
   */
  @autobind
  public EnqueueIncoming_Audio(urlaudio: string, opts?: MockEnqueueParamsMultimediaMinimal): void {
    const audioMsg: WhatsappMessage = MsgFactory_Audio(this.ChatId, this.ParticipantId_LID, urlaudio, {
      pushName: opts?.pushName,
    });
    if (opts?.bufferToReturnOn_WaitMultimedia) {
      this._chatContextMock.EnqueueMediaBufferToReturn(opts.bufferToReturnOn_WaitMultimedia);
    }
    this._receiverMock.AddWaitMsg({ rawMsg: audioMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of a video message into the mocked chat.
   * This includes optional captions and sender details.
   *
   * If a buffer override is specified, it will be used during multimedia
   * waits instead of fetching from the URL.
   *
   * @param urlVideo - URL of the video file to simulate.
   * @param opts - Optional parameters (caption, pushName, buffer).
   */
  @autobind
  public EnqueueIncoming_Video(urlVideo: string, opts?: MockEnqueueParamsMultimedia): void {
    const videoMsg: WhatsappMessage = MsgFactory_Video(this.ChatId, this.ParticipantId_LID, urlVideo, {
      caption: opts?.caption,
      pushName: opts?.pushName,
    });
    if (opts?.bufferToReturnOn_WaitMultimedia) {
      this._chatContextMock.EnqueueMediaBufferToReturn(opts.bufferToReturnOn_WaitMultimedia);
    }
    this._receiverMock.AddWaitMsg({ rawMsg: videoMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of a document message into the mocked chat.
   * Enqueues the message with proper filename and mimetype resolution.
   *
   * A mock buffer can be attached to override multimedia waits for this
   * document.
   *
   * @param urlDocument - URL of the document to simulate.
   * @param fileName - Filename to associate with the document.
   * @param opts - Optional mimetype, pushName, and buffer override.
   */
  @autobind
  public EnqueueIncoming_Document(urlDocument: string, fileName: string, opts?: MockEnqueueParamsDocument): void {
    const documentMsg: WhatsappMessage = MsgFactory_Document(this.ChatId, this.ParticipantId_LID, urlDocument, {
      fileName: fileName,
      mimetype: opts?.mimeType ?? mime.getType(path.extname(fileName)) ?? "application/pdf",
      pushName: opts?.pushName,
    });
    if (opts?.bufferToReturnOn_WaitMultimedia) {
      this._chatContextMock.EnqueueMediaBufferToReturn(opts.bufferToReturnOn_WaitMultimedia);
    }
    this._receiverMock.AddWaitMsg({ rawMsg: documentMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the sending of a location message into the mocked chat.
   * The message includes geographic coordinates and optional descriptive
   * fields like name and address.
   *
   * @param latitude - Latitude of the location.
   * @param longitude - Longitude of the location.
   * @param opts - Optional location name, address description, and pushName.
   */
  @autobind
  public EnqueueIncoming_Location(latitude: number, longitude: number, opts?: MockEnqueueParamsLocation): void {
    const locationMsg: WhatsappMessage = MsgFactory_Location(this.ChatId, this.ParticipantId_LID, latitude, longitude, {
      pushName: opts?.pushName,
      address: opts?.addressDescription,
      name: opts?.locationName,
    });
    this._receiverMock.AddWaitMsg({ rawMsg: locationMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
  }

  /**
   * Simulates the contact(s) sending mdg into the mocked chat.
   * The messaged include all contact or contacts with all mocked
   * environment metadata included.
   *
   * @param contact_s - Contact or contacts array
   * @param opts - Optional config obj: Actually including only 'pushName' prop
   */
  @autobind
  public EnqueueIncoming_Contact(contact_s: { name: string; phone: string } | Array<{ name: string; phone: string }>, opts?: MockEnqueueParamsMinimal): void {
    const contactMsg = MsgFactory_Contact(this.ChatId, this.ParticipantId_LID, contact_s, {
      pushName: opts?.pushName,
    });
    this._receiverMock.AddWaitMsg({ rawMsg: contactMsg, milisecondsDelayToRespondMock: opts?.delayMilisecondsToReponse });
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
    const botCommandsSearcher = new CommandsSearcher();
    const botSettings = BotUtils_GenerateOptions({ ...this._constructorConfig?.botSettings, cancelKeywords: this._chatContextMock.Config.cancelKeywords });
    try {
      await this._command.run(
        this._chatContextMock,
        {
          InternalSocket: this._socketMock,
          Myself: {
            Status: new Myself_Submodule_Status(this._socketMock),
            Bot: {
              Commands: botCommandsSearcher,
              Settings: botSettings,
            },
          },
        },
        {
          args: this._constructorConfig?.args ?? [],
          botInfo: {
            Commands: botCommandsSearcher,
            Settings: botSettings,
          },
          chatId: this.ChatId,
          participantIdPN: this.ParticipantId_PN,
          participantIdLID: this.ParticipantId_LID,
          msgType: this._constructorConfig?.msgType ?? MsgType.Text,
          originalRawMsg: {} as any,
          quotedMsgInfo: {} as any,
          senderType: this._senderType,
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "ChatContext is trying to wait a msg that will never arrives!... Use MockChat.EnqueueIncoming_****() to enqueue what to return!"
        ) {
          if (this.SentFromCommand.Texts.length > 0) {
            const lastMessage = this.SentFromCommand.Texts.at(-1)!.text;
            throw new Error(
              "\n\n\n[Whatsbotcord | MockChat Test Error: Deadlock]\n\n" +
                "The command is waiting for a user reply, but the mock's incoming message queue is empty.\n\n" +
                "Last Message Sent by Command:\n" +
                `"${lastMessage}"\n\n` +
                "How to Fix:\n" +
                "Use MockChat.EnqueueIncoming_...() in your test setup to provide the message the command is waiting for.\n\n\n"
            );
          }
        }
      }
      throw error;
    }
  }

  /**
   * Overrides the group metadata used in this mocked chat environment.
   * This is useful for simulating different group states (e.g., id,
   * subject, participants) without relying on real WhatsApp server data.
   *
   * Behavior:
   * - Ensures the `id` field has the correct suffix depending on whether
   *   the current sender type is group or individual.
   * - Updates the `ChatId` internally and applies the metadata to the
   *   receiver and socket mocks.
   *
   * @param metadata - Partial group metadata to inject into the mock
   *   environment. If `id` is provided, it will be normalized.
   */
  @autobind
  public SetGroupMetadataMock(metadata: Partial<GroupMetadataInfo>) {
    const actualSenderType = this._constructorConfig?.senderType ?? (this.ParticipantId_LID ? SenderType.Group : SenderType.Individual);
    if (metadata.id) {
      let newChatId: string;
      if (actualSenderType === SenderType.Group) {
        if (!metadata.id.endsWith(WhatsappGroupIdentifier)) {
          newChatId = metadata.id + WhatsappGroupIdentifier;
        } else {
          newChatId = metadata.id;
        }
      } else {
        if (!metadata.id.endsWith(WhatsappPhoneNumberIdentifier)) {
          newChatId = metadata.id + WhatsappPhoneNumberIdentifier;
        } else {
          newChatId = metadata.id;
        }
      }
      //@ts-expect-error just let this private access to exists.. hehehehehe
      this.ChatId = newChatId;
    }
    //@ts-expect-error just a little fix... jejeje
    this._chatContextMock["FixedChatId"] = this.ChatId;
    this._receiverMock.SetGroupMetadataMock({ ...metadata, id: this.ChatId });
    //With mocksocket, do not modify it, its always group
    this._socketMock.SetGroupMetadataMock(metadata);
  }

  /**
   * Resets the entire mocking environment back to its initial state.
   * This clears:
   * - Receiver mock state
   * - Sugar sender mock state
   * - Socket mock state
   * - Chat context mock state
   *
   * Use this before or after each test to ensure isolation between cases.
   */
  @autobind
  public ClearMocks(): void {
    this._receiverMock.ClearMocks();
    this._sugarSenderMock.ClearMocks();
    this._socketMock.ClearMock();
    this._chatContextMock.ClearMocks();
  }

  /**
   * Configure the buffer that will be returned in place of a real
   * downloaded multimedia message when using "ctx.WaitMultimedia(...)".
   *
   * @param anyBuffer - The buffer to return on next `WaitMultimedia` calls.
   */
  @autobind
  public SetWaitMsgBufferToReturnMock(anyBuffer: Buffer) {
    this._chatContextMock.EnqueueMediaBufferToReturn(anyBuffer);
  }
}

//Constructor:
/**
 * If SenderType.Group case
 * If SenderType.Individual case
 *
 * If provided ChatId:string
 * If provided ParticipantId_LID: string
 * If provided ParticipantId_PN: string
 */

function Constructor_ResolveChatID(chatId?: string, senderType?: SenderType): { chatIdResolved: string; updatedSenderType?: SenderType } {
  //Default case if nothing provide, returns by default individual chat id (private chat);
  const defaultIndividualChatId = "fakeUserChatPrivate" + WhatsappGroupIdentifier;

  if (senderType) {
    if (senderType === SenderType.Group) {
      if (!chatId) {
        return { chatIdResolved: "fakeChatId" + WhatsappGroupIdentifier };
      }
      if (chatId.endsWith(WhatsappGroupIdentifier)) {
        return { chatIdResolved: chatId }; //Its correct already!
      } else {
        return { chatIdResolved: chatId + WhatsappGroupIdentifier }; //Let's fix it
      }
    }

    if (senderType === SenderType.Individual) {
      if (!chatId) {
        return { chatIdResolved: defaultIndividualChatId };
      }
      if (chatId.endsWith(WhatsappPhoneNumberIdentifier)) {
        return { chatIdResolved: chatId };
      } else {
        return { chatIdResolved: chatId + WhatsappPhoneNumberIdentifier };
      }
    }
  } else if (chatId) {
    if (chatId.endsWith(WhatsappGroupIdentifier)) {
      return { chatIdResolved: chatId, updatedSenderType: SenderType.Group }; //Its correct already!
    } else if (chatId.endsWith(WhatsappPhoneNumberIdentifier)) {
      return { chatIdResolved: chatId + WhatsappPhoneNumberIdentifier, updatedSenderType: SenderType.Individual }; //Let's fix it
    }
  }

  //If, for some reason, it reaches here, return default case again.
  return { chatIdResolved: defaultIndividualChatId };
}

function Constructor_ResolveParticipantIds(
  participantId_LID?: string | null,
  participantId_PN?: string | null,
  senderType?: SenderType
): { LID: string | null; PN: string | null; senderTypeUpdated: SenderType | null } {
  const defaultLID: string = "fakeParticipnatID" + WhatsappLIDIdentifier;
  const defaultPN: string = "fakeParticipantID" + WhatsappPhoneNumberIdentifier;

  if (!participantId_LID && !participantId_PN && senderType === SenderType.Individual) {
    return { LID: null, PN: null, senderTypeUpdated: null };
  }

  let LID_ToReturn: string | null; // participant_LID => Could be (string | undefined | null)
  if (typeof participantId_LID === "string") {
    if (participantId_LID.endsWith(WhatsappLIDIdentifier)) {
      LID_ToReturn = participantId_LID; //Its ok, nothing to fix
    } else {
      LID_ToReturn = participantId_LID + WhatsappLIDIdentifier; //Let's fix it
    }
  } else if (participantId_LID === null) {
    LID_ToReturn = null;
  } else {
    //Is undefined
    LID_ToReturn = defaultLID;
  }

  let PN_ToReturn: string | null; // participant_PN => Could be (string | undefined | null)
  if (typeof participantId_PN === "string") {
    if (participantId_PN.endsWith(WhatsappPhoneNumberIdentifier)) {
      PN_ToReturn = participantId_PN; //Its ok, nothing to fix
    } else {
      PN_ToReturn = participantId_PN + WhatsappPhoneNumberIdentifier; //Let's fix it
    }
  } else if (participantId_PN === null) {
    PN_ToReturn = null;
  } else {
    //Is undefined then
    PN_ToReturn = defaultPN;
  }

  return { LID: LID_ToReturn, PN: PN_ToReturn, senderTypeUpdated: SenderType.Group };
}

// "fakeChatIdGroup" + WhatsappGroupIdentifier;
// "fakeUserChatPrivate" + WhatsappIndividualIdentifier;
