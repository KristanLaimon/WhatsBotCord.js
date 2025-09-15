import type { AnyMessageContent, GroupMetadata, MiscMessageGenerationOptions, WAMessage } from "baileys";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetSenderType } from "../../../helpers/Msg.helper.js";
import Delegate from "../../../libs/Delegate.js";
import type { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "../../../Whatsapp.types.js";
import type { IWhatsSocket_Submodule_Receiver } from "../internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "../internals/IWhatsSocket.sugarsender.js";
import { WhatsSocket_Submodule_Receiver } from "../internals/WhatsSocket.receiver.js";
import WhatsSocketSenderQueue_SubModule from "../internals/WhatsSocket.senderqueue.js";
import { WhatsSocket_Submodule_SugarSender } from "../internals/WhatsSocket.sugarsenders.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type { WhatsappMessage } from "../types.js";
import type { MsgServiceSocketMessageSentMock } from "./types.js";

export type WhatsSocketMockOptions = {
  maxQueueLimit?: number;
  minimumMilisecondsDelayBetweenMsgs?: number;
  customReceiver?: IWhatsSocket_Submodule_Receiver;
  customSugarSender?: IWhatsSocket_Submodule_SugarSender;
};

export type WhatsSocketMockSendingMsgOptions = {
  replaceTextWith?: string;
  replaceParticipantIdWith?: string;
  replaceChatIdWith?: string;
  customMsgType?: MsgType;
  changeSenderType?: SenderType;
};

export default class WhatsSocketMock implements IWhatsSocket {
  // ==== Interface dependencies ====
  onRestart: Delegate<() => Promise<void>> = new Delegate();
  onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void> = new Delegate();
  onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, type: MsgType, senderType: SenderType) => void> = new Delegate();
  onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WAMessage, msgType: MsgType, senderType: SenderType) => void> = new Delegate();
  onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();
  ownJID: string = "ownIDMock" + WhatsappIndividualIdentifier;

  Send: IWhatsSocket_Submodule_SugarSender;
  Receive: IWhatsSocket_Submodule_Receiver;

  private _senderQueue: WhatsSocketSenderQueue_SubModule;

  constructor(options?: WhatsSocketMockOptions) {
    this._senderQueue = new WhatsSocketSenderQueue_SubModule(this, options?.maxQueueLimit ?? 10, options?.minimumMilisecondsDelayBetweenMsgs ?? 500);

    this.Send = options?.customSugarSender ?? new WhatsSocket_Submodule_SugarSender(this);
    this.Receive = options?.customReceiver ?? new WhatsSocket_Submodule_Receiver(this);

    //Thanks js, this is never needed on another languages... ☠️
    this._SendRaw = this._SendRaw.bind(this);
    this._SendSafe = this._SendSafe.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
    this.ClearMock = this.ClearMock.bind(this);
  }

  public SentMessagesThroughQueue: MsgServiceSocketMessageSentMock[] = [];
  public SentMessagesThroughRaw: MsgServiceSocketMessageSentMock[] = [];

  public GroupsIDTriedToFetch: string[] = [];

  public IsOn: boolean = false;

  public async Start(): Promise<void> {
    this.IsOn = true;
  }
  public async Shutdown(): Promise<void> {
    this.IsOn = false;
  }
  public async _SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessagesThroughQueue.push({
      chatId: chatId_JID,
      content: content,
      miscOptions: options,
    });
    return this._senderQueue.Enqueue(chatId_JID, content, options);
  }

  public async _SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessagesThroughRaw.push({
      chatId: chatId_JID,
      content,
      miscOptions: options,
    });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier,
      },
    };
  }

  /**
   * Gets the metadata of a group chat by its chat ID. (e.g: "23423423123@g.us")
   * @param chatId The chat ID of the group you want to get metadata from.
   * @returns A promise that resolves to the group metadata.
   */
  public async GetGroupMetadata(chatId: string): Promise<GroupMetadata> {
    this.GroupsIDTriedToFetch.push(chatId);
    return {
      id: chatId,
      subject: "Mock Group",
      creation: Date.now(),
      creator: "Some User",
    } as any;
  }

  public ClearMock(): void {
    this.IsOn = false;
    this.GroupsIDTriedToFetch = [];
    this.SentMessagesThroughQueue = [];

    this.onRestart.Clear();
    this.onIncomingMsg.Clear();
    this.onGroupEnter.Clear();
    this.onGroupUpdate.Clear();
    this.onStartupAllGroupsIn.Clear();
    this.onUpdateMsg.Clear();
    this.SentMessagesThroughRaw = [];
    this.SentMessagesThroughQueue = [];
  }

  /**
   * Simulates the reception of a message from whatsapp asynchronously!
   * @param rawMsg The message to be sent.
   * @param options Optional options to modify the message before sending it.
   *                Currently only supports replacing the text of the message.
   * @returns Resolves to void.
   */
  public async MockSendMsgAsync(rawMsg: WhatsappMessage, options?: WhatsSocketMockSendingMsgOptions): Promise<void> {
    const info = this._extractInfoFromWhatsMsg(rawMsg, options);
    await this.onIncomingMsg.CallAllAsync(
      info.rawMsg.key.participant ?? null,
      info.rawMsg.key.remoteJid!,
      info.rawMsg,
      options?.customMsgType ?? info.msgType,
      options?.changeSenderType ?? info.senderType
    );
  }

  /**
   * Simulates the reception of a message from whatsapp synchronously!
   * @param rawMsg The message to be sent.
   * @param options Optional options to modify the message before sending it.
   *                Currently only supports replacing the text of the message.
   * @returns Resolves to void.
   */
  public MockSendMsg(rawMsg: WhatsappMessage, options?: WhatsSocketMockSendingMsgOptions): void {
    const info = this._extractInfoFromWhatsMsg(rawMsg, options);
    this.onIncomingMsg.CallAll(
      info.rawMsg.key.participant ?? null,
      info.rawMsg.key.remoteJid!,
      info.rawMsg,
      options?.customMsgType ?? info.msgType,
      options?.changeSenderType ?? info.senderType
    );
  }

  private _extractInfoFromWhatsMsg(rawMsg: WhatsappMessage, options?: WhatsSocketMockSendingMsgOptions) {
    const msgType: MsgType = MsgHelper_FullMsg_GetMsgType(rawMsg);
    const senderType: SenderType = MsgHelper_FullMsg_GetSenderType(rawMsg);

    let msgToReturn: WhatsappMessage;
    if (options) {
      msgToReturn = structuredClone(rawMsg);
      if (!rawMsg.message) {
        msgToReturn.message = {};
      }
      //=== Options handling ====
      if (options?.replaceTextWith) {
        msgToReturn.message!.conversation = options.replaceTextWith;
      }

      if (options?.replaceParticipantIdWith) {
        msgToReturn.key.participant = options.replaceParticipantIdWith;
      }

      if (options?.replaceChatIdWith) {
        msgToReturn.key.remoteJid = options.replaceChatIdWith;
      }
    } else {
      msgToReturn = rawMsg;
    }

    return { rawMsg: msgToReturn, msgType, senderType };
  }
}
