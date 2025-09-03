import type { WAMessage } from "baileys";
import { MsgHelper_GetTextFrom } from "../../../helpers/Msg.helper";
import type { MsgType, SenderType } from "../../../Msg.types";
import type { IWhatsSocket } from "../IWhatsSocket";

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
  incomingRawMsg: WAMessage,
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
  wrongTypeFeedbackMsg: string;

  /** Whether to ignore messages sent by the bot itself. Default: true */
  ignoreSelfMessages: boolean;
};

/**
 * Represents an error that occurs during message reception.
 */
export type WhatsMsgReceiverError = {
  /** Human-readable error message. */
  errorMessage: string;

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

/**
 * Submodule responsible for listening and waiting for messages through a WhatsSocket instance.
 */
export class WhatsSocketReceiver_SubModule {
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
   * @returns Promise that resolves with the WAMessage that met the condition or rejects with an error.
   */
  private _waitNextMsg(
    successConditionCallback: SuccessConditionCallback,
    chatIdToLookFor: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WAMessage> {
    //Options default values
    const { cancelKeywords = [], ignoreSelfMessages = true, timeoutSeconds = 30, wrongTypeFeedbackMsg } = options;

    return new Promise((resolve: (waMessage: WAMessage) => void, reject: (reason: WhatsMsgReceiverError) => void) => {
      let timer: NodeJS.Timeout;
      const resetTimeout = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
          reject({ wasAbortedByUser: false, errorMessage: "User didn't responded in time", chatId: chatIdToLookFor, userId: null });
        }, timeoutSeconds * 1000);
      };

      const listener = (userId: string | null, chatId: string, msg: WAMessage, msgType: MsgType, senderType: SenderType) => {
        if (msg.key.remoteJid !== chatIdToLookFor) return;

        if (ignoreSelfMessages) {
          if (msg.key.fromMe) return;
        }

        resetTimeout();

        //If not null, means it is a valid text message with readable content as plain text;
        const expectedTxtMsgContent: string | null = MsgHelper_GetTextFrom(msg);

        //Priority #1: Check if its a suspicious msg (very large)
        if (expectedTxtMsgContent) {
          if (expectedTxtMsgContent.length > 1000) {
            this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
            clearTimeout(timer);
            reject({ wasAbortedByUser: false, errorMessage: "User has sent too much text", chatId: chatId, userId: userId });
            return;
          }
        }

        //Priority #2: Check if it fits our conditions
        if (!successConditionCallback(userId, chatId, msg, msgType, senderType)) return;

        //Priority #3: Check if user is trying to cancel this command
        if (expectedTxtMsgContent) {
          for (let i = 0; i < cancelKeywords.length; i++) {
            const cancelKeyWordToCheck = cancelKeywords[i];
            if (cancelKeyWordToCheck && expectedTxtMsgContent.includes(cancelKeyWordToCheck)) {
              this._whatsSocket.onIncomingMsg.Unsubscribe(listener);
              clearTimeout(timer);
              reject({ wasAbortedByUser: true, errorMessage: "User has canceled the dialog", chatId: chatId, userId: userId });
              return;
            }
          }
        }

        //Priority #4: All good?, User not cancelling, large text, or even text, let's verify if its the type expected
        if (msgType !== expectedMsgType) {
          this._whatsSocket.SendSafe(chatId, { text: wrongTypeFeedbackMsg });
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
   * @param userIDToWait - The participant ID to wait for.
   * @param chatToWaitOnID - Group chat ID to monitor.
   * @param expectedMsgType - Type of message expected.
   * @param options - Options for timeout, cancel keywords, etc.
   * @returns The next WAMessage from the specified user.
   */
  public async WaitUntilNextRawMsgFromUserIDInGroup(
    userIDToWait: string,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WAMessage> {
    const conditionCallback: SuccessConditionCallback = (_senderID, _chatId, msg, _msgType, _senderType) => msg.key.participant === userIDToWait;
    return await this._waitNextMsg(conditionCallback, chatToWaitOnID, expectedMsgType, options);
  }

  /**
   * Waits for the next message from a specific user in a private 1:1 conversation.
   *
   * Fun fact: Whatsapp takes user id as CHAT ID when talking to them in 1:1 conversation.
   *
   * @param userIdToWait - The user ID to wait for.
   * @param expectedMsgType - Expected message type.
   * @param options - Options for timeout, cancel keywords, etc.
   * @returns The next WAMessage from the specified user.
   */
  public async WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WAMessage> {
    const conditionCallback: SuccessConditionCallback = (__userId, chatId, __incomingRawMsg, __incomingMsgType, __incomindSenderType) =>
      chatId === userIdToWait;
    return await this._waitNextMsg(conditionCallback, userIdToWait, expectedMsgType, options);
  }
}
