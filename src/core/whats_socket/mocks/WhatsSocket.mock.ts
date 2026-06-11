import { autobind } from "../../../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetSenderType } from "../../../helpers/Msg.helper.js";
import { WhatsappIdType } from "../../../helpers/Whatsapp.helper.js";
import Delegate from "../../../libs/Delegate.js";
import type { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import type { IWhatsSocket_Submodule_Group } from "../internals/IWhatsSocket.groups.js";
import type { IWhatsSocket_Submodule_Receiver } from "../internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "../internals/IWhatsSocket.sugarsender.js";
import type { GroupMetadataInfo } from "../internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_Receiver } from "../internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_SugarSender } from "../internals/WhatsSocket.sugarsenders.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type {
  WhatsappGroupMetadata,
  WhatsappGroupParticipantAction,
  WhatsappMessage,
  WhatsappMessageContent,
  WhatsappMessageOptions,
  WhatsappPollUpdateMessage,
  WhatsappPollVote,
} from "../types.js";
import type { WhatsSocketMockMsgSent } from "./types.js";

export type WhatsSocketMockOptions = {
  maxQueueLimit?: number;
  minimumMilisecondsDelayBetweenMsgs?: number;
  customReceiver?: IWhatsSocket_Submodule_Receiver;
  customSugarSender?: IWhatsSocket_Submodule_SugarSender;
  customGroup?: IWhatsSocket_Submodule_Group;
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
  onSentMessage: Delegate<(chatId: string, rawContentMsg: WhatsappMessageContent, optionalMisc?: WhatsappMessageOptions) => void> = new Delegate();
  onIncomingMsg: Delegate<
    (participantId_LID: string | null, participantId_PN: string | null, chatId: string, rawMsg: WhatsappMessage, type: MsgType, senderType: SenderType) => void
  > = new Delegate();
  onUpdateMsg: Delegate<
    (
      participantId_LID: string | null,
      participantId_PN: string | null,
      chatId: string,
      rawMsgUpdate: WhatsappMessage,
      msgType: MsgType,
      senderType: SenderType
    ) => void
  > = new Delegate();
  onGroupEnter: Delegate<(groupInfo: WhatsappGroupMetadata) => void> = new Delegate();
  onGroupUpdate: Delegate<(groupInfo: Partial<WhatsappGroupMetadata>) => void> = new Delegate();
  onStartupAllGroupsIn: Delegate<(allGroupsIn: WhatsappGroupMetadata[]) => void> = new Delegate();
  ownJID: string = "ownIDMock" + WhatsappPhoneNumberIdentifier;

  Send: IWhatsSocket_Submodule_SugarSender;
  Receive: IWhatsSocket_Submodule_Receiver;
  group: IWhatsSocket_Submodule_Group;
  Socket: any;

  // private _senderQueue: WhatsSocketSenderQueue_SubModule;

  constructor(options?: WhatsSocketMockOptions) {
    // this._senderQueue = new WhatsSocketSenderQueue_SubModule(this, options?.maxQueueLimit ?? 10, options?.minimumMilisecondsDelayBetweenMsgs ?? 500);

    this.Send = options?.customSugarSender ?? new WhatsSocket_Submodule_SugarSender(this);
    this.Receive = options?.customReceiver ?? new WhatsSocket_Submodule_Receiver(this);
    this.group = options?.customGroup ?? new WhatsSocketMock_Group(this);

    //Thanks js, this is never needed on another languages... ☠️
    this._SendRaw = this._SendRaw.bind(this);
    this._SendSafe = this._SendSafe.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this.GetRawGroupMetadata = this.GetRawGroupMetadata.bind(this);
    this.ClearMock = this.ClearMock.bind(this);
    this._NormalizeJid = this._NormalizeJid.bind(this);
    this._GetBotJid = this._GetBotJid.bind(this);
    this._FetchAllGroups = this._FetchAllGroups.bind(this);
    this._UpdateGroupParticipants = this._UpdateGroupParticipants.bind(this);

    this.Socket = {
      normalizeJid: this._NormalizeJid,
      getBotJid: this._GetBotJid,
      fetchAllGroups: this._FetchAllGroups,
      updateGroupParticipants: this._UpdateGroupParticipants,
    };
  }

  public SentMessagesThroughQueue: WhatsSocketMockMsgSent[] = [];
  public SentMessagesThroughRaw: WhatsSocketMockMsgSent[] = [];

  public GroupsIDTriedToFetch: string[] = [];

  public IsOn: boolean = false;

  public async Start(): Promise<void> {
    this.IsOn = true;
  }
  public async Shutdown(): Promise<void> {
    this.IsOn = false;
  }
  public async _SendSafe(chatId_JID: string, content: WhatsappMessageContent, options?: WhatsappMessageOptions): Promise<WhatsappMessage | null> {
    let chatIdToUse: string;
    if (!chatId_JID.endsWith(WhatsappGroupIdentifier)) {
      chatIdToUse = chatId_JID + WhatsappGroupIdentifier;
    } else {
      chatIdToUse = chatId_JID;
    }

    this.SentMessagesThroughQueue.push({
      chatId: chatIdToUse,
      content: content,
      miscOptions: options,
    });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage from SendSafe",
      },
      key: {
        fromMe: false,
        id: "23423423234" + WhatsappLIDIdentifier,
        remoteJid: "falseid" + WhatsappGroupIdentifier,
      },
    };
  }

  public async _SendRaw(chatId_JID: string, content: WhatsappMessageContent, options?: WhatsappMessageOptions): Promise<WhatsappMessage | null> {
    let chatIdToUse: string;
    if (!chatId_JID.endsWith(WhatsappGroupIdentifier)) {
      chatIdToUse = chatId_JID + WhatsappGroupIdentifier;
    } else {
      chatIdToUse = chatId_JID;
    }
    this.SentMessagesThroughRaw.push({
      chatId: chatIdToUse,
      content,
      miscOptions: options,
    });
    return {
      message: {
        conversation: "Mock Minimum Object WAMessage from SendRaw",
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
  @autobind
  public async GetRawGroupMetadata(chatId: string): Promise<WhatsappGroupMetadata> {
    this.GroupsIDTriedToFetch.push(chatId);
    return await this.group.getMetadata(chatId);
  }

  public _NormalizeJid(jid: string): string {
    return jid.trim();
  }

  public _GetBotJid(): string {
    return this._NormalizeJid(this.ownJID);
  }

  public async _FetchAllGroups(): Promise<WhatsappGroupMetadata[]> {
    return [await this.GetRawGroupMetadata("mock-group" + WhatsappGroupIdentifier)];
  }

  public async _UpdateGroupParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<unknown[]> {
    if (this.group instanceof WhatsSocketMock_Group) {
      return await this.group.updateParticipants(groupId, participants, action);
    }

    return participants.map((participant) => ({ jid: participant, status: "200", action }));
  }

  public async _LeaveGroup(groupId: string): Promise<void> {
    if (this.group instanceof WhatsSocketMock_Group) {
      await this.group.leave(groupId);
    }
  }

  public async _DeleteChatLocally(chatId: string): Promise<void> {
    if (this.group instanceof WhatsSocketMock_Group) {
      await this.group.deleteChat(chatId);
    }
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
    if (this.group instanceof WhatsSocketMock_Group) {
      this.group.ClearMock();
    }
  }

  public async DownloadMediaMessage(_rawMsg: WhatsappMessage): Promise<Buffer> {
    return Buffer.from([]);
  }

  public async GetPollVotes(_pollRawMsg: WhatsappMessage, _pollUpdates: WhatsappPollUpdateMessage[]): Promise<WhatsappPollVote[]> {
    return [];
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
      info.rawMsg.key.participantAlt ?? null,
      info.rawMsg.key.remoteJid!,
      info.rawMsg,
      options?.customMsgType ?? info.msgType,
      options?.changeSenderType ?? info.senderType
    );
  }

  /**
   * @deprecated Use 'MockSendMsgAsync()' instead from this object 'WhatsSocketMock'. Its more reliable and normally
   * all code logic related to mockSending is Promised-Based....
   *
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
      info.rawMsg.key.participantAlt ?? null,
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

export class WhatsSocketMock_Group implements IWhatsSocket_Submodule_Group {
  public UpdatedParticipants: Array<{ groupId: string; participants: string[]; action: WhatsappGroupParticipantAction }> = [];
  public LeftGroups: string[] = [];
  public DeletedChats: string[] = [];

  private readonly _socket: WhatsSocketMock;

  public constructor(socket: WhatsSocketMock) {
    this._socket = socket;
  }

  public async FetchGroupData(chatId: string): Promise<GroupMetadataInfo | null> {
    const rawMeta = await this.getMetadata(chatId);
    return {
      id: rawMeta.id,
      groupName: rawMeta.subject,
      creationDate: rawMeta.creation ?? null,
      ownerName: rawMeta.owner ?? null,
      groupDescription: rawMeta.desc ?? null,
      sendingMode: WhatsappIdType.Legacy,
      communityIdWhereItBelongs: null,
      inviteCode: null,
      lastNameChangeDateTime: null,
      author: null,
      members: rawMeta.participants.map((m) => {
        const rawId = (m.id ?? m.lid)?.split("@")[0] ?? "";
        return {
          WhatsappIdType: m.lid ? WhatsappIdType.Modern : WhatsappIdType.Legacy,
          rawId,
          asMentionFormatted: `@${rawId}`,
          isAdmin: m.admin === "admin" || m.admin === "superadmin",
        };
      }),
      isCommunityAnnounceChannel: rawMeta.isCommunityAnnounce ?? null,
      ephemeralDuration: rawMeta.ephemeralDuration ?? null,
      membersCount: rawMeta["size"] ?? null,
      membersCanAddOtherMembers: rawMeta.memberAddMode === true,
      needsRequestApprovalToJoinIn: rawMeta.joinApprovalMode === true,
      onlyAdminsCanChangeGroupSettings: rawMeta.restrict === true,
      onlyAdminsCanSendMsgs: rawMeta.announce === true,
    };
  }

  public normalizeJid(jid: string): string {
    return jid.trim();
  }

  public getBotJid(): string {
    return this.normalizeJid(this._socket.ownJID);
  }

  public async getMetadata(groupId: string): Promise<WhatsappGroupMetadata> {
    return await this._socket.GetRawGroupMetadata(groupId);
  }

  public async getAll(): Promise<WhatsappGroupMetadata[]> {
    return [await this.getMetadata("mock-group" + WhatsappGroupIdentifier)];
  }

  public async findByName(name: string): Promise<WhatsappGroupMetadata | null> {
    const groups = await this.getAll();
    return groups.find((group) => group.subject === name) ?? null;
  }

  public async isBotAdmin(groupId: string): Promise<boolean> {
    const metadata = await this.getMetadata(groupId);
    const botJid = this.getBotJid();
    const botParticipant = metadata.participants.find((participant) => {
      const participantJid = participant.id ?? participant.lid;
      return participantJid ? this.normalizeJid(participantJid) === botJid : false;
    });

    return botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";
  }

  public async updateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<unknown[]> {
    if (participants.length === 0) {
      return [];
    }

    const normalizedParticipants = participants.map((participant) => this.normalizeJid(participant));
    this.UpdatedParticipants.push({ groupId, participants: normalizedParticipants, action });
    return normalizedParticipants.map((participant) => ({ jid: participant, status: "200", action }));
  }

  public async addParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    return await this.updateParticipants(groupId, participants, "add");
  }

  public async removeParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    return await this.updateParticipants(groupId, participants, "remove");
  }

  public async promoteParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    return await this.updateParticipants(groupId, participants, "promote");
  }

  public async demoteParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    return await this.updateParticipants(groupId, participants, "demote");
  }

  public async removeAllParticipants(groupId: string): Promise<void> {
    const metadata = await this.getMetadata(groupId);
    const botJid = this.getBotJid();
    const participants = metadata.participants
      .map((participant) => participant.id ?? participant.lid ?? null)
      .filter((participant): participant is string => participant !== null)
      .map((participant) => this.normalizeJid(participant))
      .filter((participant) => participant !== botJid);

    await this.removeParticipants(groupId, participants);
  }

  public async leave(groupId: string): Promise<void> {
    this.LeftGroups.push(groupId);
  }

  public async deleteChat(groupId: string): Promise<void> {
    this.DeletedChats.push(groupId);
  }

  public async cleanup(groupId: string): Promise<void> {
    await this.removeAllParticipants(groupId);
    await this.leave(groupId);
    await this.deleteChat(groupId);
  }


  public ClearMock(): void {
    this.UpdatedParticipants = [];
    this.LeftGroups = [];
    this.DeletedChats = [];
  }
}
