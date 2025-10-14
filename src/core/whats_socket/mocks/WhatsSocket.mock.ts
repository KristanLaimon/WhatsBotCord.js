import { type AnyMessageContent, type GroupMetadata, type GroupParticipant, type MiscMessageGenerationOptions, type WAMessage } from "baileys";
import { autobind } from "../../../helpers/Decorators.helper.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetSenderType } from "../../../helpers/Msg.helper.js";
import Delegate from "../../../libs/Delegate.js";
import type { MsgType, SenderType } from "../../../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import type { IWhatsSocket_Submodule_Receiver } from "../internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "../internals/IWhatsSocket.sugarsender.js";
import type { GroupMetadataInfo, ParticipantInfo } from "../internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_Receiver } from "../internals/WhatsSocket.receiver.js";
import { WhatsSocket_Submodule_SugarSender } from "../internals/WhatsSocket.sugarsenders.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type { WhatsappMessage } from "../types.js";
import type { WhatsSocketMockMsgSent } from "./types.js";

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
  onIncomingMsg: Delegate<
    (participantId_LID: string | null, participantId_PN: string | null, chatId: string, rawMsg: WAMessage, type: MsgType, senderType: SenderType) => void
  > = new Delegate();
  onUpdateMsg: Delegate<
    (
      participantId_LID: string | null,
      participantId_PN: string | null,
      chatId: string,
      rawMsgUpdate: WAMessage,
      msgType: MsgType,
      senderType: SenderType
    ) => void
  > = new Delegate();
  onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();
  ownJID: string = "ownIDMock" + WhatsappPhoneNumberIdentifier;

  Send: IWhatsSocket_Submodule_SugarSender;
  Receive: IWhatsSocket_Submodule_Receiver;

  // private _senderQueue: WhatsSocketSenderQueue_SubModule;

  constructor(options?: WhatsSocketMockOptions) {
    // this._senderQueue = new WhatsSocketSenderQueue_SubModule(this, options?.maxQueueLimit ?? 10, options?.minimumMilisecondsDelayBetweenMsgs ?? 500);

    this.Send = options?.customSugarSender ?? new WhatsSocket_Submodule_SugarSender(this);
    this.Receive = options?.customReceiver ?? new WhatsSocket_Submodule_Receiver(this);

    //Thanks js, this is never needed on another languages... ☠️
    this._SendRaw = this._SendRaw.bind(this);
    this._SendSafe = this._SendSafe.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this.GetRawGroupMetadata = this.GetRawGroupMetadata.bind(this);
    this.ClearMock = this.ClearMock.bind(this);
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
  public async _SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
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

  public async _SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
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

  private _groupMetadataMock?: GroupMetadata;

  @autobind
  public SetGroupMetadataMock(groupData: Partial<GroupMetadataInfo>) {
    let chatIdToUse: string | undefined;
    if (groupData.id) {
      if (!groupData.id.endsWith(WhatsappGroupIdentifier)) {
        chatIdToUse = groupData.id + WhatsappGroupIdentifier;
      } else {
        chatIdToUse = groupData.id;
      }
    }
    this._groupMetadataMock = {
      id: chatIdToUse ?? "fakeIdGroup" + WhatsappGroupIdentifier,
      addressingMode: groupData?.sendingMode === "pn" ? "pn" : "lid",
      owner: groupData?.ownerName ?? undefined,
      subject: groupData?.groupName ?? "GroupName",
      desc: groupData?.groupDescription ?? undefined,
      linkedParent: groupData?.communityIdWhereItBelongs ?? undefined,
      restrict: groupData?.onlyAdminsCanChangeGroupSettings ?? undefined,
      announce: groupData?.onlyAdminsCanSendMsgs ?? undefined,
      memberAddMode: groupData?.membersCanAddOtherMembers ?? undefined,
      joinApprovalMode: groupData?.needsRequestApprovalToJoinIn ?? undefined,
      isCommunity: false, // not exposed in high-level
      isCommunityAnnounce: groupData?.isCommunityAnnounceChannel ?? undefined,
      size: groupData?.membersCount ?? undefined,
      ephemeralDuration: groupData?.ephemeralDuration ?? undefined,
      inviteCode: groupData?.inviteCode ?? undefined,
      subjectTime: groupData?.lastNameChangeDateTime ?? undefined,
      author: groupData?.author ?? undefined,
      creation: groupData?.creationDate ?? undefined,
      participants: groupData?.members ? groupData?.members.map(mapParticipant) : [],
    };
  }

  /**
   * Gets the metadata of a group chat by its chat ID. (e.g: "23423423123@g.us")
   * @param chatId The chat ID of the group you want to get metadata from.
   * @returns A promise that resolves to the group metadata.
   */
  @autobind
  public async GetRawGroupMetadata(chatId: string): Promise<GroupMetadata> {
    this.GroupsIDTriedToFetch.push(chatId);
    if (this._groupMetadataMock) {
      return this._groupMetadataMock;
    } else {
      return {
        id: chatId,
        subject: "Mock Group",
        creation: Date.now(),
        creator: "Some User",
      } as any;
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
      info.rawMsg.key.participantPn ?? null,
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
      info.rawMsg.key.participantPn ?? null,
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

function mapParticipant(p: ParticipantInfo): GroupParticipant {
  return {
    id: p.rawId ?? "defaultId" + WhatsappLIDIdentifier, // from WhatsappIDInfo
    name: undefined,
    notify: undefined,
    status: undefined,
    verifiedName: undefined,
    imgUrl: undefined,
    lid: undefined,
    isAdmin: p.isAdmin,
    isSuperAdmin: p.isAdmin, // or undefined if you prefer
    admin: p.isAdmin ? "admin" : null,
  };
}
