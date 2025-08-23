import Delegate from '../../../libs/Delegate';
import type { IWhatsSocket } from '../IWhatsSocket';
import { SenderType, type MsgType } from '../../../Msg.types';
import type { GroupMetadata, WAMessage, AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import WhatsSocketSenderQueue from '../internals/WhatsSocket.senderqueue';
import type { WhatsSocketMessageSentMock } from './types';
import { WhatsAppGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from 'src/Whatsapp.types';

export type WhatsSocketMockOptions = {
  maxQueueLimit?: number;
  minimumSecondsDelayBetweenMsgs: number;
}

export default class WhatsSocketMock implements IWhatsSocket {
  onReconnect: Delegate<() => Promise<void>> = new Delegate();
  onMessageUpsert: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, type: MsgType, senderType: SenderType) => void> = new Delegate();
  onMessageUpdate: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WAMessage, msgType: MsgType, senderType: SenderType) => void> = new Delegate();
  onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();

  ownJID: string = "ownIDMock" + WhatsappIndividualIdentifier;

  private _senderQueue: WhatsSocketSenderQueue;

  constructor(options?: WhatsSocketMockOptions) {
    this._senderQueue = new WhatsSocketSenderQueue(this, options?.maxQueueLimit ?? 10, options?.minimumSecondsDelayBetweenMsgs ?? 500);

    //Thanks js, this is never needed on another languages... ☠️
    this.SendRaw = this.SendRaw.bind(this);
    this.SendSafe = this.SendRaw.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Start.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
    this.ClearMock = this.ClearMock.bind(this);
  }

  private _messagesSentHistory: WhatsSocketMessageSentMock[] = [];

  //Only get access, not set
  public get SentMessages(): WhatsSocketMessageSentMock[] {
    return this._messagesSentHistory;
  }

  public GroupsIDTriedToFetch: string[] = [];

  public IsOn: boolean = false;

  public Start(): Promise<void> {
    this.IsOn = true;
    return Promise.resolve();
  }
  public Shutdown(): Promise<void> {
    this.IsOn = false;
    return Promise.resolve();
  }
  public async SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    return await this._senderQueue.Enqueue(chatId_JID, content, options);
  }

  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    this._messagesSentHistory.push({ chatId: chatId_JID, content, miscOptions: options, isRawMsg: true });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsAppGroupIdentifier
      }
    };
  }

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
    this._messagesSentHistory = [];
    this.GroupsIDTriedToFetch = [];

    this.onReconnect.Clear();
    this.onMessageUpsert.Clear();
    this.onGroupEnter.Clear();
    this.onGroupUpdate.Clear();
    this.onStartupAllGroupsIn.Clear();
    this.onMessageUpdate.Clear();
  }

}