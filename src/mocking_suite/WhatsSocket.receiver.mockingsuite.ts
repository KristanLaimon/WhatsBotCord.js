import type { IChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { IWhatsSocket_Submodule_Receiver } from "../core/whats_socket/internals/IWhatsSocket.receiver.js";
import type { WhatsSocketReceiverError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import {
  type GroupMetadataInfo,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverMsgError,
} from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsappIdType } from "../helpers/Whatsapp.helper.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import { MsgType } from "../Msg.types.js";

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

  //=================================================== Spy External Methods ==================================================
  /**
   * All waited msgs from command after its execution
   */
  public Waited: WhatsSocketReceiverMsgWaited[] = [];
  //===========================================================================================================================

  public constructor() {}

  public AddWaitMsg(toAdd: WhatsSocketReceiverWaitObject) {
    this._queueWait.push(toAdd);
  }

  public ClearMocks() {
    this._queueWait = [];
    this.Waited = [];
  }

  //_local Options is not used, just used in real commands, here is not necessary;
  public WaitMsg(
    userID_LID_ToWait: string | null,
    userID_PN_to_wait: string | null,
    chatId: string,
    expectedType: MsgType,
    _localOptions?: Partial<IChatContextConfig>
  ): Promise<WhatsappMessage> {
    return new Promise((resolve, reject) => {
      // Removed async from here
      if (this._queueWait.length === 0) {
        return reject(
          new Error("ChatContext is trying to wait a msg that will never arrives!... Use MockChat.EnqueueIncoming_****() to enqueue what to return!")
        );
      }
      const actualWaitedObjInfo = this._queueWait.shift()!;
      const timeoutPromise = new Promise<never>((_, rejectTimeout) => {
        if (_localOptions?.timeoutSeconds) {
          setTimeout(() => {
            rejectTimeout({
              errorMessage: WhatsSocketReceiverMsgError.Timeout,
              wasAbortedByUser: false,
              chatId: chatId,
              participantId_LID: userID_LID_ToWait,
              participantId_PN: userID_PN_to_wait,
            } satisfies WhatsSocketReceiverError);
          }, _localOptions.timeoutSeconds * 1000);
        }
      });

      const messageProcessingPromise = (async () => {
        const actualMsg_msgType = MsgHelper_FullMsg_GetMsgType(actualWaitedObjInfo.rawMsg);

        if (actualWaitedObjInfo.milisecondsDelayToRespondMock) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, actualWaitedObjInfo.milisecondsDelayToRespondMock));
        }

        if (_localOptions?.cancelKeywords) {
          if (actualMsg_msgType === MsgType.Text) {
            const txt = MsgHelper_FullMsg_GetText(actualWaitedObjInfo.rawMsg);
            if (txt) {
              const wordsLowerCased = txt.split(" ").map((word) => word.toLowerCase());
              for (const cancelWord of _localOptions.cancelKeywords) {
                if (wordsLowerCased.includes(cancelWord.toLowerCase())) {
                  throw {
                    errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting,
                    chatId: chatId,
                    participantId_LID: userID_LID_ToWait,
                    participantId_PN: userID_PN_to_wait,
                    wasAbortedByUser: true,
                  } satisfies WhatsSocketReceiverError;
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

        this.Waited.push({
          options: _localOptions,
          chatId: chatId,
          partipantId_LID: userID_LID_ToWait,
          participantId_PN: userID_PN_to_wait,
          waitedMsgType: actualMsg_msgType,
        });

        return actualWaitedObjInfo.rawMsg;
      })();

      try {
        Promise.race([messageProcessingPromise, timeoutPromise]).then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
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

  public async FetchGroupData(_chatId: string): Promise<GroupMetadataInfo | null> {
    console.warn(
      "FetchGroupData is deprecated in WhatsSocket_Submodule_Receiver_MockingSuite and has been moved to WhatsSocket_Submodule_Group_MockingSuite. Please use the group mock instead."
    );
    return {
      id: _chatId,
      sendingMode: WhatsappIdType.Modern,
      ownerName: "Mock Owner",
      groupName: "Mock Group",
      groupDescription: "This is a mock group for deprecated FetchGroupData",
      communityIdWhereItBelongs: null,
      onlyAdminsCanChangeGroupSettings: false,
      onlyAdminsCanSendMsgs: false,
      membersCanAddOtherMembers: true,
      needsRequestApprovalToJoinIn: false,
      isCommunityAnnounceChannel: false,
      membersCount: 3,
      ephemeralDuration: null,
      inviteCode: "mock-invite-code",
      lastNameChangeDateTime: null,
      author: "Mock Author",
      creationDate: 1600000000,
      members: [
        {
          rawId: "1234567890@s.whatsapp.net",
          isAdmin: true,
        },
        {
          rawId: "0987654321@s.whatsapp.net",
          isAdmin: false,
        },
      ],
    };
  }

  public async DownloadMediaMessage(_rawMsg: WhatsappMessage): Promise<Buffer> {
    return Buffer.from([]);
  }
}
