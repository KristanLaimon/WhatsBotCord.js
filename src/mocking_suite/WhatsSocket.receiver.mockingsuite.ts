import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import type { IWhatsSocket_Submodule_Receiver } from "../core/whats_socket/internals/IWhatsSocket.receiver.js";
import type { WhatsSocketReceiverError } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import {
  type ChatContextGroupData,
  type WhatsSocketReceiverWaitOptions,
  WhatsSocketReceiverMsgError,
} from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetText } from "../helpers/Msg.helper.js";
import { WhatsappIdType } from "../helpers/Whatsapp.helper.js";
import { MsgType } from "../Msg.types.js";

export type ChatContextSpyWhatsMsg = {
  rawMsg: WhatsappMessage;
};

export default class WhatsSocket_Submodule_Receiver_MockingSuite implements IWhatsSocket_Submodule_Receiver {
  private _queueWait: ChatContextSpyWhatsMsg[] = [];

  //=================================================== Spy External Methods ==================================================
  //                                                           Text
  public Waited_Text: Array<{ options: Partial<ChatContextConfig> }> = [];
  //===========================================================================================================================

  public AddWaitMsg(toAdd: ChatContextSpyWhatsMsg) {
    this._queueWait.push(toAdd);
  }

  public ClearMocks() {
    this._queueWait = [];
  }

  //_local Options is not used, just used in real commands, here is not necessary;
  public async WaitMsg(
    participantId: string | null,
    chatId: string,
    expectedType: MsgType,
    _localOptions?: Partial<ChatContextConfig>
  ): Promise<WhatsappMessage> {
    if (this._queueWait.length === 0) {
      throw new Error("ChatContext is trying to wait a msg that will never arrives!... Use MockChat.Send*() to enqueue what to return!");
    }
    const toSend = this._queueWait.shift()!;
    const actualMsg_msgType = MsgHelper_FullMsg_GetMsgType(toSend.rawMsg);

    if (_localOptions) {
      //Actually, only used cancelKeywords param!
      if (_localOptions?.cancelKeywords) {
        if (actualMsg_msgType === MsgType.Text) {
          const txt = MsgHelper_FullMsg_GetText(toSend.rawMsg);
          if (txt) {
            //TODO: Possible problem if is 10000 chars long?, well, its for mocking purposes, so...
            const wordsLowerCased = txt.split(" ").map((word) => word.toLowerCase());
            for (const cancelWord of _localOptions.cancelKeywords) {
              if (wordsLowerCased.includes(cancelWord.toLowerCase())) {
                throw {
                  errorMessage: WhatsSocketReceiverMsgError.UserCanceledWaiting,
                  chatId: chatId,
                  userId: participantId,
                  wasAbortedByUser: true,
                } satisfies WhatsSocketReceiverError;
              }
            }
          }
        }
      }
    }

    if (actualMsg_msgType !== expectedType) {
      throw new Error(`ChatContext received a msg of type ${MsgType[actualMsg_msgType]}`);
    }

    //TODO: Implement per msg type
    if (_localOptions) {
      switch (actualMsg_msgType) {
        case MsgType.Text:
          this.Waited_Text.push({ options: _localOptions });
          break;
      }
    }

    return toSend.rawMsg;
  }

  public WaitUntilNextRawMsgFromUserIDInGroup(
    userIDToWait: string,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    return this.WaitMsg(userIDToWait, chatToWaitOnID, expectedMsgType, options);
  }

  public WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    return this.WaitMsg(null, userIdToWait, expectedMsgType, options);
  }

  public async GetGroupMetadata(chatId: string): Promise<ChatContextGroupData | null> {
    const mockChatContextGroupData: ChatContextGroupData = {
      id: chatId,
      sendingMode: WhatsappIdType.Modern,
      ownerName: "John Doe",
      groupName: "Team Awesome",
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
    return mockChatContextGroupData;
  }
}
