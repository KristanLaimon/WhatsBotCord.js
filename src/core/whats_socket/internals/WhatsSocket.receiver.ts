import { MsgHelper_FullMsg_GetText } from "../../../helpers/Msg.helper.js";
import type { MsgType, SenderType } from "../../../Msg.types.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type { WhatsappMessage } from "../types.js";

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
export class WhatsSocket_Submodule_Receiver {
  private _whatsSocket: IWhatsSocket;

  /**
   * @param socket - An instance of a WhatsSocket (must implement IWhatsSocket).
   */
  constructor(socket: IWhatsSocket) {
    this._whatsSocket = socket;
  }

  /**
   * Internal helper that waits for the next message satisfying a success condition.
   *
   * @param successConditionCallback - Callback to determine if the message meets the success criteria.
   * @param chatIdToLookFor - Chat ID where the message should arrive.
   * @param expectedMsgType - Expected type of the message.
   * @param options - Configuration options for timeout, cancel keywords, etc.
   * @returns Promise that resolves with the WhatsappMessage that met the condition or rejects with an error.
   */
  private _waitNextMsg(
    successConditionCallback: SuccessConditionCallback,
    chatIdToLookFor: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    //Options default values
    const { cancelKeywords = [], ignoreSelfMessages = true, timeoutSeconds = 30, wrongTypeFeedbackMsg, cancelFeedbackMsg } = options;

    return new Promise((resolve: (WhatsappMessage: WhatsappMessage) => void, reject: (reason: WhatsSocketReceiverError) => void) => {
      let timer: NodeJS.Timeout;
      const resetTimeout = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
          reject({ wasAbortedByUser: false, errorMessage: WhatsSocketReceiverMsgError.Timeout, chatId: chatIdToLookFor, userId: null });
        }, timeoutSeconds * 1000);
      };

      const listener = (userId: string | null, chatId: string, msg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => {
        if (msg.key.remoteJid !== chatIdToLookFor) return;

        if (ignoreSelfMessages) {
          if (msg.key.fromMe) return;
        }

        resetTimeout();

        //If not null, means it is a valid text message with readable content as plain text;
        const expectedTxtMsgContent: string | null = MsgHelper_FullMsg_GetText(msg);

        //Priority #1: Check if its a suspicious msg (very large)
        // @deprecated!
        // if (expectedTxtMsgContent) {
        //   if (expectedTxtMsgContent.length > 1000) {
        //     this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
        //     clearTimeout(timer);
        //     reject({ wasAbortedByUser: false, errorMessage: "User has sent too much text", chatId: chatId, userId: userId });
        //     return;
        //   }
        // }

        //Priority #2: Check if it fits our conditions
        if (!successConditionCallback(userId, chatId, msg, msgType, senderType)) return;

        //Priority #3: Check if user is trying to cancel this command
        if (expectedTxtMsgContent) {
          for (let i = 0; i < cancelKeywords.length; i++) {
            const cancelKeyWordToCheck = cancelKeywords[i];
            if (cancelKeyWordToCheck && expectedTxtMsgContent.includes(cancelKeyWordToCheck)) {
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

        //Priority #4: All good?, User not cancelling, or even text, let's verify if its the type expected
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

  /**
   * Waits for the next message from a specific user in a group chat.
   *
   * The returned promise resolves only if the specified participant sends
   * a message of the expected type.
   *
   * If the timeout is reached, or if the wait is explicitly cancelled,
   * the promise may reject or throw an error depending on configuration.
   *
   * @throws error if timeout reached
   * @param userIDToWait - The participant ID to wait for.
   * @param chatToWaitOnID - Group chat ID to monitor.
   * @param expectedMsgType - The type of message to wait for.
   * @param options - Options such as timeout duration, cancel keywords, etc.
   * @returns Resolves with the next `WhatsappMessage` from the specified user,
   *          or rejects/throws on timeout or cancellation.
   */
  public async WaitUntilNextRawMsgFromUserIDInGroup(
    userIDToWait: string,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    const conditionCallback: SuccessConditionCallback = (_senderID, _chatId, msg, _msgType, _senderType) => msg.key.participant === userIDToWait;
    return await this._waitNextMsg(conditionCallback, chatToWaitOnID, expectedMsgType, options);
  }

  /**
   * Waits for the next message from a specific user in a private 1:1 conversation.
   *
   * Fun fact: WhatsApp treats the user ID itself as the chat ID in private conversations.
   *
   * The returned promise resolves only if the specified user sends a message of
   * the expected type.
   *
   * If the timeout is reached, or if the wait is explicitly cancelled,
   * the promise may reject or throw an error depending on configuration.
   * @throws error if timeout reached
   * @param userIdToWait - The user ID to wait for.
   * @param expectedMsgType - The type of message to wait for.
   * @param options - Options such as timeout duration, cancel keywords, etc.
   * @returns Resolves with the next `WhatsappMessage` from the specified user,
   *          or rejects/throws on timeout or cancellation.
   */
  public async WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage> {
    const conditionCallback: SuccessConditionCallback = (__userId, chatId, __incomingRawMsg, __incomingMsgType, __incomindSenderType) =>
      chatId === userIdToWait;
    return await this._waitNextMsg(conditionCallback, userIdToWait, expectedMsgType, options);
  }
}
