import type { GroupMetadata } from "baileys";
import { MsgHelper_FullMsg_GetText } from "../../../helpers/Msg.helper.js";
import { type WhatsappIDInfo, WhatsappHelper_ExtractWhatsappIdFromWhatsappRawId, WhatsappIdType } from "../../../helpers/Whatsapp.helper.js";
import { type SenderType, MsgType } from "../../../Msg.types.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type { WhatsappMessage } from "../types.js";
import type { IWhatsSocket_Submodule_Receiver } from "./IWhatsSocket.receiver.js";

/**
 * Callback type used to determine whether a received message satisfies a success condition.
 *
 * @param userId - The WhatsApp sender ID of the message (may be null for broadcasts).
 * @param chatId - The ID of the chat the message belongs to.
 * @param incomingRawMsg - The raw message object from Baileys.
 * @param incomingMsgType - The type of the message.
 * @param incomingSenderType - Whether the sender is a group member, self, etc.
 * @returns true if the message satisfies the success condition; false otherwise.
 */
type SuccessConditionCallback = (
  userId: string | null,
  chatId: string,
  incomingRawMsg: WhatsappMessage,
  incomingMsgType: MsgType,
  incomingSenderType: SenderType
) => boolean;

/**
 * Options used to configure the WaitNextMsg behavior.
 */
export type WhatsSocketReceiverWaitOptions = {
  /** Maximum time (in seconds) to wait for a valid message before rejecting. */
  timeoutSeconds: number;

  /** Array of keywords that, if present in a message, will cancel the wait. */
  cancelKeywords: string[];

  /** Message sent back to the user if they send a message of the wrong type. */
  wrongTypeFeedbackMsg?: string;

  cancelFeedbackMsg?: string;

  /** Whether to ignore messages sent by the bot itself. Default: true */
  ignoreSelfMessages: boolean;
};

/**
 * Represents an error that occurs during message reception.
 */
export type WhatsSocketReceiverError = {
  /** Human-readable error message. */
  errorMessage: WhatsSocketReceiverMsgError;

  /** Whether the wait was aborted because the user sent a cancel keyword. */
  wasAbortedByUser: boolean;

  /**
   * If this error msg comes from group, this will be the participant ID who
   * triggered this waiting msg.
   * Otherwise, if this comes from private chat, will be null
   */
  userId: string | null;

  /**
   * Whatsapp chat ID where this msgError came from
   */
  chatId: string;
};

export enum WhatsSocketReceiverMsgError {
  Timeout = "User didn't responded in time",
  UserCanceledWaiting = "User has canceled the dialog",
}

/**
 * Checks if an object is a `WhatsMsgReceiverError`, this error comes from ChatContext if using "Wait" methods,
 * or directly from WhatsMsgReceiver Submodule.
 *
 * @param anything The thing to check.
 * @returns Whether `anything` is a `WhatsMsgReceiverError`.
 * @category Internal
 */
export function WhatsSocketReceiverHelper_isReceiverError(anything: unknown): anything is WhatsSocketReceiverError {
  return (
    typeof anything === "object" &&
    anything !== null &&
    "errorMessage" in anything &&
    "wasAbortedByUser" in anything &&
    "userId" in anything &&
    "chatId" in anything
  );
}

/**
 * Submodule responsible for listening and waiting for messages through a WhatsSocket instance.
 */
export class WhatsSocket_Submodule_Receiver implements IWhatsSocket_Submodule_Receiver {
  private _whatsSocket: IWhatsSocket;

  /**
   * @param socket - An instance of a WhatsSocket (must implement IWhatsSocket).
   */
  constructor(socket: IWhatsSocket) {
    this._whatsSocket = socket;
    //DO NOT use decorator @autobind for this class, tests start to fail due to that, here has to be done manually
    this.FetchGroupData = this.FetchGroupData.bind(this);
    this.WaitUntilNextRawMsgFromUserIDInGroup = this.WaitUntilNextRawMsgFromUserIDInGroup.bind(this);
    this.WaitUntilNextRawMsgFromUserIdInPrivateConversation = this.WaitUntilNextRawMsgFromUserIdInPrivateConversation.bind(this);
    this._waitNextMsg = this._waitNextMsg.bind(this);
  }

  /**
   * Internal helper that waits for the next message satisfying a success condition.
   * Cancel logic and MsgType checking validation is made here, do not do it on successConditionCallback
   *
   * @param successConditionCallback - Callback to determine if the message meets the success criteria.
   * @param chatIdToLookFor - Chat ID where the message should arrive.
   * @param expectedMsgType - Expected type of the message.
   * @param options - Configuration options for timeout, cancel keywords, etc.
   * @returns Promise that resolves with the WhatsappMessage that met the condition or rejects with an error.
   */
  private _waitNextMsg(
    successConditionCallback: SuccessConditionCallback,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    //Options default values
    const { cancelKeywords = [], ignoreSelfMessages = true, timeoutSeconds = 30, cancelFeedbackMsg, wrongTypeFeedbackMsg } = options;

    let cachedChatId: string = "====default ID===== (this is error msg), check WhatsSocket.receiver.ts";
    return new Promise((resolve: (WhatsappMessage: WhatsappMessage) => void, reject: (reason: WhatsSocketReceiverError) => void) => {
      let timer: NodeJS.Timeout;
      const resetTimeout = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
          reject({ wasAbortedByUser: false, errorMessage: WhatsSocketReceiverMsgError.Timeout, chatId: cachedChatId, userId: null });
        }, timeoutSeconds * 1000);
      };

      const listener = (userId: string | null, chatId: string, msg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => {
        // @deprecated_line: This is supposed to be validated on param 'successConditionCallback'
        // if (msg.key.remoteJid !== chatIdToLookFor) return;
        cachedChatId = chatId;
        if (ignoreSelfMessages) {
          if (msg.key.fromMe) return;
        }

        resetTimeout();

        //Priority #2: Check if it fits our conditions
        if (!successConditionCallback(userId, chatId, msg, msgType, senderType)) return;

        if (msgType === MsgType.Text) {
          //Priority #1: Check if user is trying to cancel this command
          const expectedTxtMsgContent: string | null = MsgHelper_FullMsg_GetText(msg);
          if (expectedTxtMsgContent) {
            const wordsLowerCased = expectedTxtMsgContent.split(" ").map((word) => word.toLowerCase());
            for (let i = 0; i < wordsLowerCased.length; i++) {
              const actualWord = wordsLowerCased[i]!;
              if (cancelKeywords.includes(actualWord)) {
                this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
                clearTimeout(timer);
                if (cancelFeedbackMsg) {
                  this._whatsSocket.Send.Text(chatId, cancelFeedbackMsg);
                }
                reject({ wasAbortedByUser: true, errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting, chatId: chatId, userId: userId });
                return;
              }
            }
          }
        }

        // Priority #3: All good?, User not cancelling, or even text, let's verify if its the type expected
        if (msgType !== expectedMsgType) {
          if (wrongTypeFeedbackMsg) {
            this._whatsSocket.Send.Text(chatId, wrongTypeFeedbackMsg);
          }
          return;
        }

        this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
        clearTimeout(timer);
        resolve(msg);
        return;
      };
      //Set initial timeout
      resetTimeout();

      // Start listening for msgs
      this._whatsSocket.onIncomingMsg.Subscribe(listener);
    });
  }

  public async WaitUntilNextRawMsgFromUserIDInGroup(
    userIDToWait: string,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    //@note:  ChatId validation is already done on this._waitNextMsg method
    const conditionCallback: SuccessConditionCallback = (participantID, actualChatID, _, _actualMsgType, ___) => {
      //#1 Comes from same group?
      if (actualChatID !== chatToWaitOnID) return false;
      //#2 Its from the expected participant?
      if (participantID !== userIDToWait) return false;

      return true;
    };
    return await this._waitNextMsg(conditionCallback, expectedMsgType, options);
  }

  public async WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    //@note:  ChatId validation is already done on this._waitNextMsg method
    const conditionCallback: SuccessConditionCallback = (_userId, actualChatId, _rawMsg, _actualMsgType, _senderType) => {
      if (userIdToWait !== actualChatId) return false;
      return true;
    };
    return await this._waitNextMsg(conditionCallback, expectedMsgType, options);
  }

  public async FetchGroupData(chatId: string): Promise<GroupMetadataInfo | null> {
    let res: GroupMetadata;
    try {
      //In case its a bad chatId and comes from individual msg
      res = await this._whatsSocket.GetRawGroupMetadata(chatId);
    } catch {
      return null;
    }
    const participants: ParticipantInfo[] = res.participants.map((info): ParticipantInfo => {
      const foundId = info.id || info.lid;
      let foundWhatsInfo: WhatsappIDInfo | null = null;
      if (foundId) {
        foundWhatsInfo = WhatsappHelper_ExtractWhatsappIdFromWhatsappRawId(foundId);
      }
      return {
        isAdmin: info.admin === "superadmin",
        asMentionFormatted: foundWhatsInfo?.asMentionFormatted,
        rawId: foundWhatsInfo?.rawId,
        WhatsappIdType: foundWhatsInfo?.WhatsappIdType,
      };
    });
    return {
      id: res.id,
      sendingMode: res.addressingMode === "pn" ? WhatsappIdType.Legacy : WhatsappIdType.Modern,
      ownerName: res.subjectOwner || res.owner || null,
      groupName: res.subject,
      groupDescription: res.desc || null,
      inviteCode: res.inviteCode || null,
      communityIdWhereItBelongs: res.isCommunity ? res.id : null,
      onlyAdminsCanChangeGroupSettings: res.restrict || null,
      onlyAdminsCanSendMsgs: res.announce || null,
      membersCanAddOtherMembers: res.memberAddMode || null,
      needsRequestApprovalToJoinIn: res.joinApprovalMode ?? null,
      isCommunityAnnounceChannel: res.isCommunityAnnounce || null,
      membersCount: res.participants.length || null,
      ephemeralDuration: res.ephemeralDuration || null,
      author: null,
      lastNameChangeDateTime: res.subjectTime || null,
      creationDate: res.creation || null,
      members: participants,
    };
  }
}

/**
 * Represents a participant in a WhatsApp group.
 */
export type ParticipantInfo = {
  /** Whether this participant is an admin */
  isAdmin: boolean;
} & WhatsappIDInfo;

/**
 * Represents all relevant metadata for a WhatsApp group chat.
 */
export type GroupMetadataInfo = {
  /** Group ID */
  id: string;
  /** Sending mode of the group */
  sendingMode: WhatsappIdType;
  /** Name of the group owner */
  ownerName: string | null;
  /** Display name of the group */
  groupName: string;
  /** Group description */
  groupDescription: string | null;
  /** ID of the parent community if the group belongs to one */
  communityIdWhereItBelongs: string | null;
  /** Whether only admins can change group settings */
  onlyAdminsCanChangeGroupSettings: boolean | null;
  /** Whether only admins can send messages */
  onlyAdminsCanSendMsgs: boolean | null;
  /** Whether members can add other members */
  membersCanAddOtherMembers: boolean | null;
  /** Whether joining requires approval */
  needsRequestApprovalToJoinIn: boolean | null;
  /** Whether the group is a community announce channel */
  isCommunityAnnounceChannel: boolean | null;
  /** Total number of participants */
  membersCount: number | null;
  /** Ephemeral message duration in seconds, if enabled */
  ephemeralDuration: number | null;
  /** Invite code for the group */
  inviteCode: string | null;
  /** Timestamp of the last group name change */
  lastNameChangeDateTime: number | null;
  /** The person who added the bot or changed a setting */
  author: string | null;
  /** Timestamp of group creation */
  creationDate: number | null;
  /** Array of group participants */
  members: ParticipantInfo[];
};
