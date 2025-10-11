import type { IChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { IWhatsSocket_Submodule_Receiver } from "../core/whats_socket/internals/IWhatsSocket.receiver.js";
import type { WhatsSocketReceiverError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import {
  type GroupMetadataInfo,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverMsgError,
} from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import { WhatsappIdType } from "../helpers/Whatsapp.helper.js";
import { MsgType } from "../Msg.types.js";
import { WhatsappGroupIdentifier } from "../Whatsapp.types.js";

export type WhatsSocketReceiverWaitObject = {
  rawMsg: WhatsappMessage;
  milisecondsDelayToRespondMock?: number;
};

export type WhatsSocketReceiverMsgWaited = {
  waitedMsgType: MsgType;
  chatId: string;
  partipantId_LID: string | null;
  participantId_PN: string | null;
  options?: Partial<IChatContextConfig>;
};

export default class WhatsSocket_Submodule_Receiver_MockingSuite implements IWhatsSocket_Submodule_Receiver {
  /**
   * Pending msgs to send to command when executed.
   */
  private _queueWait: WhatsSocketReceiverWaitObject[] = [];

  /**
   * Config: Actual metadata to mock when executing command (Environment mock)
   */
  private _groupMetadataToSendMock: GroupMetadataInfo;
  public get GroupMetadataToSendMock(): GroupMetadataInfo | undefined {
    return this._groupMetadataToSendMock;
  }

  //=================================================== Spy External Methods ==================================================
  /**
   * All waited msgs from command after its execution
   */
  public Waited: WhatsSocketReceiverMsgWaited[] = [];
  //===========================================================================================================================

  public constructor() {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public SetGroupMetadataMock(mock: Partial<GroupMetadataInfo>) {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata(mock);
  }
  public ResetGroupMetadata() {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public AddWaitMsg(toAdd: WhatsSocketReceiverWaitObject) {
    this._queueWait.push(toAdd);
  }

  public ClearMocks() {
    this._queueWait = [];
    this.Waited = [];
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  //_local Options is not used, just used in real commands, here is not necessary;
  public async WaitMsg(
    userID_LID_ToWait: string | null,
    userID_PN_toWait: string | null,
    chatId: string,
    expectedType: MsgType,
    _localOptions?: Partial<IChatContextConfig>
  ): Promise<WhatsappMessage> {
    if (this._queueWait.length === 0) {
      throw new Error("ChatContext is trying to wait a msg that will never arrives!... Use MockChat.EnqueueIncoming_****() to enqueue what to return!");
    }
    const toSend = this._queueWait.shift()!;

    const actualMsg_msgType = MsgHelper_FullMsg_GetMsgType(toSend.rawMsg);

    if (_localOptions) {
      //Actually, only used cancelKeywords param!
      if (_localOptions?.cancelKeywords) {
        if (actualMsg_msgType === MsgType.Text) {
          const txt = MsgHelper_FullMsg_GetText(toSend.rawMsg);
          if (txt) {
            const wordsLowerCased = txt.split(" ").map((word) => word.toLowerCase());
            for (const cancelWord of _localOptions.cancelKeywords) {
              if (wordsLowerCased.includes(cancelWord.toLowerCase())) {
                throw {
                  errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting,
                  chatId: chatId,
                  participantId_LID: userID_LID_ToWait,
                  participantId_PN: userID_PN_toWait,
                  wasAbortedByUser: true,
                } satisfies WhatsSocketReceiverError;
              }
            }
          }
        }
      }
    }

    if (actualMsg_msgType !== expectedType) {
      throw new Error(
        `You have received a msg of type ${MsgType[actualMsg_msgType]} when you expected of type ${MsgType[expectedType]}!, check what are you sending from MockChat.EnqueueIncoming_****() msg!, try again...`
      );
    }

    if (toSend.milisecondsDelayToRespondMock) {
      await new Promise<void>((resolve) => setTimeout(resolve, toSend.milisecondsDelayToRespondMock));
    }

    this.Waited.push({
      options: _localOptions,
      chatId: chatId,
      partipantId_LID: userID_LID_ToWait,
      participantId_PN: userID_PN_toWait,
      waitedMsgType: actualMsg_msgType,
    });

    return toSend.rawMsg;
  }

  public WaitUntilNextRawMsgFromUserIDInGroup(
    userID_LID_ToWait: string | null,
    userID_PN_toWait: string | null,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    return this.WaitMsg(userID_LID_ToWait, userID_PN_toWait, chatToWaitOnID, expectedMsgType, options);
  }

  public WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    return this.WaitMsg(null, null, userIdToWait, expectedMsgType, options);
  }

  /**
   * Important note: chatId param Is ignored, if you want to set a custom mock group metadata, use SetGroupMetadataMock() of this class
   * @param _chatId Is ignored, if you want to set a custom mock group metadata, use SetGroupMetadataMock() of this class
   * @returns The mocked group metadata establish in this mock receiver
   */
  public async FetchGroupData(_chatId: string): Promise<GroupMetadataInfo | null> {
    if (_chatId) {
      return { ...this._groupMetadataToSendMock, id: _chatId };
    } else {
      return this._groupMetadataToSendMock;
    }
  }
}

/**
 * Generates a default group metadata object for mocking purposes.
 *
 * - Provides sensible defaults for all {@link GroupMetadataInfo} fields.
 * - Allows overriding any field by passing a partial object.
 *
 * @param chatContextData - Partial group data to override defaults.
 * @returns A fully populated {@link GroupMetadataInfo}.
 */
export function GenerateDefaultGroupMetadata(chatContextData: Partial<GroupMetadataInfo> = {}): GroupMetadataInfo {
  const defaults: GroupMetadataInfo = {
    id: "fakeChatId" + WhatsappGroupIdentifier,
    sendingMode: WhatsappIdType.Modern,
    ownerName: "John Doe",
    groupName: "DEFAULT_groupname",
    groupDescription: "A group for awesome team collaboration!",
    communityIdWhereItBelongs: null,
    onlyAdminsCanChangeGroupSettings: true,
    onlyAdminsCanSendMsgs: false,
    membersCanAddOtherMembers: true,
    needsRequestApprovalToJoinIn: false,
    isCommunityAnnounceChannel: false,
    membersCount: 25,
    ephemeralDuration: 86400, // 24 hours in seconds
    inviteCode: "abc123xyz",
    lastNameChangeDateTime: 1694726400000, // Example timestamp (2023-09-15)
    author: "mock_author",
    creationDate: 1694640000000, // Example timestamp (2023-09-14)
    members: [
      {
        asMentionFormatted: "@12345678901",
        rawId: "12345678901@s.whatsapp.net",
        isAdmin: true,
        WhatsappIdType: WhatsappIdType.Modern,
      },
      {
        asMentionFormatted: "@12345678902",
        rawId: "12345678902@s.whatsapp.net",
        isAdmin: false,
        WhatsappIdType: WhatsappIdType.Modern,
      },
      {
        asMentionFormatted: "@12345678903",
        rawId: "12345678903@s.whatsapp.net",
        isAdmin: false,
        WhatsappIdType: WhatsappIdType.Modern,
      },
    ],
  };

  return {
    ...defaults,
    ...chatContextData,
    members: chatContextData.members ?? defaults.members,
  };
}
