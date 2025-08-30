
import type { GroupMetadata, WAMessage } from 'baileys';
import { MsgType, SenderType } from 'src/Msg.types';
import type WhatsSocket from '../WhatsSocket';
import type { IWhatsSocket } from '../IWhatsSocket';
import { MsgHelper_GetTextFrom } from 'src/helpers/Msg.helper';
// import type { BotWaitMessageError } from '../types/bot';
// import { MsgType, SenderType } from '../types/commands';
// import WhatsSocket from './WhatsSocket';
// import { Msg_GetTextFromRawMsg, Msg_MsgTypeToString } from '../utils/rawmsgs';
// import { Phone_GetFullPhoneInfoFromRawMsg } from '../utils/phonenumbers';

type SuccessConditionCallback = (userId: string | null, chatId: string, incomingRawMsg: WAMessage, incomingMsgType: MsgType, incomingSenderType: SenderType) => boolean;

type WaitOptions = {
  timeoutSeconds: number;
  cancelKeywords: string[];
  wrongTypeFeedbackMsg: string;
  ignoreSelfMessages: boolean;
}

export type WhatsMsgReceiverError = {
  errorMessage: string;
  wasAbortedByUser: boolean;
}

export class WhatsMsgReceiver {
  private _whatsSocket: IWhatsSocket;

  constructor(socket: IWhatsSocket) {
    this._whatsSocket = socket;
  }

  private _waitNextMsg(successConditionCallback: SuccessConditionCallback, chatSenderId: string, expectedMsgType: MsgType, options: WaitOptions): Promise<WAMessage> {
    //Options default values
    const { cancelKeywords = [], ignoreSelfMessages = true, timeoutSeconds = 30, wrongTypeFeedbackMsg } = options

    return new Promise((resolve: (waMessage: WAMessage) => void, reject: (reason: WhatsMsgReceiverError) => void) => {
      let timer: NodeJS.Timeout;
      const resetTimeout = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          this._whatsSocket.onMessageUpsert.Unsubscribe(listener);
          reject({ wasAbortedByUser: false, errorMessage: "User didn't responded in time" });
        }, timeoutSeconds * 1000);
      }

      const listener = (userId: string | null, chatId: string, msg: WAMessage, msgType: MsgType, senderType: SenderType) => {
        if (msg.key.remoteJid !== chatSenderId) return;

        if (ignoreSelfMessages) {
          if (msg.key.fromMe) return;
        }

        if (msgType !== expectedMsgType) {
          this._whatsSocket.SendSafe(chatId, { text: wrongTypeFeedbackMsg })
          return;
        }

        resetTimeout();

        //If not null, means it is a valid text message with readable content as plain text;
        const expectedTxtMsgContent: string | null = MsgHelper_GetTextFrom(msg);
        if (expectedTxtMsgContent) {
          if (expectedTxtMsgContent.length > 1000) {
            this._whatsSocket.onMessageUpsert.Unsubscribe(listener);
            clearTimeout(timer);
            reject({ wasAbortedByUser: false, errorMessage: "User has sent too much text" });
            return;
          }
        }

        if (!successConditionCallback(userId, chatId, msg, msgType, senderType)) return;

        if (expectedTxtMsgContent) {
          for (let i = 0; i < cancelKeywords.length; i++) {
            const cancelKeyWordToCheck = cancelKeywords[i];
            if (cancelKeyWordToCheck && expectedTxtMsgContent.includes(cancelKeyWordToCheck)) {
              this._whatsSocket.onMessageUpsert.Unsubscribe(listener);
              clearTimeout(timer);
              reject({ wasAbortedByUser: true, errorMessage: "User has canceled the dialog" });
              return;
            }
          }
        }

        this._whatsSocket.onMessageUpsert.Unsubscribe(listener);
        clearTimeout(timer);
        resolve(msg);
        return;
      }
      //Set initial timeout
      resetTimeout();

      // Start listening for msgs
      this._whatsSocket.onMessageUpsert.Subscribe(listener);
    });
  }

  //TODO: Add senderID: string | null and finish refactoring this whole class to be usable with i18n | localization facilities
  public async WaitNextRawMsgFromSenderId(senderId: string, chatId: string, expectedMsgType: MsgType, options: WaitOptions): Promise<WAMessage> {
    const conditionCallback: SuccessConditionCallback = (_senderID, _chatId, msg, _msgType, _senderType) => ((msg.key.participant || msg.key.remoteJid) === senderId);
    return await this._waitNextMsg(conditionCallback, chatId, expectedMsgType, options);
  }

  public async WaitNextRawMsgFromWhatsId(chatSenderId: string, userSenderId: string, expectedWhatsId: string, expectedMsgType: MsgType, timeout?: number, wrongTypeMsgFeedback?: string): Promise<WAMessage> {
    const conditionCallback: SuccessConditionCallback = (_chatId, msg, _msgType, _senderType) => {
      const actualWhatsId = Phone_GetFullPhoneInfoFromRawMsg(msg)!.whatsappId;
      return actualWhatsId === expectedWhatsId;
    }
    return await this._waitNextMsg(conditionCallback, chatSenderId, userSenderId, expectedMsgType, timeout, wrongTypeMsgFeedback);
  }

  public async WaitUntilRawTxtMsgFromWhatsId(chatSenderId: string, userSenderId: string, expectedCleanedWhatsappId: string, regexExpected: RegExp, timeout?: number, wrongTypeMsgFeedback?: string): Promise<WAMessage> {
    const cb: SuccessConditionCallback = (_chatId, msg, msgType, _senderType) => {
      if (msgType !== MsgType.text) return false;
      const actualWhatsId = Phone_GetFullPhoneInfoFromRawMsg(msg)!.whatsappId;
      const msgTxt = Msg_GetTextFromRawMsg(msg);
      const isFromExpectedPhoneUser = actualWhatsId === expectedCleanedWhatsappId;
      const isMsgFormatExpected = regexExpected.test(msgTxt);
      return isFromExpectedPhoneUser && isMsgFormatExpected;
    }
    return await this._waitNextMsg(cb, chatSenderId, userSenderId, MsgType.text, timeout, wrongTypeMsgFeedback);
  }

  public async GetGroupMetadata(chatSenderId: string): Promise<GroupMetadata | null> {
    return await this._whatsSocket.GetGroupMetadata(chatSenderId);
  }
}