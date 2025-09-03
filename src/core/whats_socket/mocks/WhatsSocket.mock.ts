import Delegate from "../../../libs/Delegate";
import type { IWhatsSocket } from "../IWhatsSocket";
import type { SenderType } from "../../../Msg.types";
import { type MsgType } from "../../../Msg.types";
import type { GroupMetadata, WAMessage, AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import WhatsSocketSenderQueue_SubModule from "../internals/WhatsSocket.senderqueue";
import type { WhatsSocketMessageSentMock } from "./types";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "src/Whatsapp.types";
import { WhatsSocketSugarSender_Submodule } from '../internals/WhatsSocket.sugarsenders';
import { WhatsSocketReceiver_SubModule } from '../internals/WhatsSocket.receiver';

export type WhatsSocketMockOptions = {
  maxQueueLimit?: number;
  minimumMilisecondsDelayBetweenMsgs: number;
}

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

  Send: WhatsSocketSugarSender_Submodule = new WhatsSocketSugarSender_Submodule(this);
  Receive: WhatsSocketReceiver_SubModule = new WhatsSocketReceiver_SubModule(this);

  private _senderQueue: WhatsSocketSenderQueue_SubModule;

  constructor(options?: WhatsSocketMockOptions) {
    this._senderQueue = new WhatsSocketSenderQueue_SubModule(this, options?.maxQueueLimit ?? 10, options?.minimumMilisecondsDelayBetweenMsgs ?? 500);

    //Thanks js, this is never needed on another languages... ☠️
    this.SendRaw = this.SendRaw.bind(this);
    this.SendSafe = this.SendSafe.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
    this.ClearMock = this.ClearMock.bind(this);
  }

  public SentMessagesThroughQueue: WhatsSocketMessageSentMock[] = [];
  public SentMessagesThroughRaw: WhatsSocketMessageSentMock[] = [];

  public GroupsIDTriedToFetch: string[] = [];

  public IsOn: boolean = false;

  public async Start(): Promise<void> {
    this.IsOn = true;
  }
  public async Shutdown(): Promise<void> {
    this.IsOn = false;
  }
  public async SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessagesThroughQueue.push({ chatId: chatId_JID, content: content, miscOptions: options });
    return this._senderQueue.Enqueue(chatId_JID, content, options);
  }

  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this.SentMessagesThroughRaw.push({ chatId: chatId_JID, content, miscOptions: options });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier
      }
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
      creator: "Some User"
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
}