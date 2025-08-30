import { it, expect } from "bun:test";
import { type WAMessage } from "baileys";
import WhatsSocketMock from '../mocks/WhatsSocket.mock';
import { WhatsSocketReceiver_SubModule, type WhatsSocketReceiverWaitOptions } from './WhatsSocket.receiver';
import { Groupmsg, IndividualMsg } from 'src/helpers/Whatsapp.helper.mocks';
import { MsgType, SenderType } from 'src/Msg.types';
import { performance } from "node:perf_hooks";
import { skipLongTests } from 'src/Envs';

//TODO: Complete this TODO LIST tests to make for WhatsSocketReceiver
/**TODO: List of things to test for receiving messages
 * WhatsSocketReceiver
 * === Basic ===
 * 1. [X] Receives the msg the moment it arrives (Works at least the basic feature expected, receive a msg)
 * 2. [X] Receives the msg the moment it arreives with delay time => e.g (user takes more than 2-3 seconds to send);
 * === Params ===
 * 1. [ ] Doesn't accept messages with incorrect type 
 *    - Must keep waiting until get correct type msg or timeout expires (what happens first)
 *    - Must succeed if it gets the correct msg before timeout occurs
 *    - 1.1 [ ] Must send a wrongtypemsg string when incorrect type
 * 
 * 2. [ ] Uses cancel keywords
 *    - If user sends one of cancel keywords, the whole process is canceled and should not keep waiting for a msg
 *    
 * 3. [ ] Timeout waiting time
 *    - If timeout occurs, should cancel itself and stop waiting for msg from user, even though user sends a correct msg type
 */

const WAITOPTIONS: WhatsSocketReceiverWaitOptions = {
  cancelKeywords: ["cancel", "cancelar"],
  ignoreSelfMessages: true,
  timeoutSeconds: 5, /** Same as each test timeout default time (5 seconds) */
  wrongTypeFeedbackMsg: "Generic error msg for wrong type receiver msg.... (change if needed)"
}

//========================= ===  MINIMUM FEATURE expected Testing (at least should receive messages without freeze or keep waiting infinitely) ========================= 
it("WhenGettingBasicMsg_FROMINDIVIDUAL_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive = new WhatsSocketReceiver_SubModule(mockSocket);
  const senderId: string = "555123456789@s.whatsapp.net";
  const msgWaitingPromise: Promise<WAMessage> = receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, WAITOPTIONS);
  const userSendingMsgPromise: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onMessageUpsert.CallAll(null, senderId, IndividualMsg, MsgType.Text, SenderType.Individual);
    resolve();
  });
  const waitedMsg: WAMessage = await Promise.all([msgWaitingPromise, userSendingMsgPromise]).then(([waitedMsg, _void]) => waitedMsg);
  expect(waitedMsg).toBeDefined();
  expect(waitedMsg).toMatchObject(IndividualMsg);
});

it("WhenGettingBasicMsg_FROMGROUP_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive = new WhatsSocketReceiver_SubModule(mockSocket);
  const senderId: string = "999888777666@lid";
  const chatId: string = "123456789012345@g.us"
  const msgWaitingPromise: Promise<WAMessage> = receive.WaitUntilNextRawMsgFromUserIDInGroup(senderId, chatId, MsgType.Text, WAITOPTIONS);
  const userFromGroupSendingMsgPromise: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onMessageUpsert.CallAll(senderId, chatId, Groupmsg, MsgType.Text, SenderType.Group);
    resolve();
  });
  const waitedMsg: WAMessage = await Promise.all([msgWaitingPromise, userFromGroupSendingMsgPromise]).then(([waitedMsg, _void]) => waitedMsg);
  expect(waitedMsg).toBeDefined();
  expect(waitedMsg).toMatchObject(Groupmsg);
})

//=========================  MINIMUM FEATURE (like before) with Delays timers inside timeout time range | LONG TESTS ========================= 
//TODO: Use skipLongTests variable when finishing this tests
it.skipIf(skipLongTests)("WhenGettingBasicMsgWithDelay_FROMINDIVIDUAL_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive/**module*/ = new WhatsSocketReceiver_SubModule(mockSocket);

  const senderId: string = "555123456789@s.whatsapp.net";
  const secondsFromUserToSendMsgDelay: number = 3;
  const timeoutSecondsExpected: number = 5;
  const marginErrorMiliseconds: number = 500;

  const startTime: number = performance.now();
  //=============================================================
  const msgWaitingPromise: Promise<WAMessage> = receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, { ...WAITOPTIONS, timeoutSeconds: timeoutSecondsExpected });
  const userActuallySendsTheMsgPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      mockSocket.onMessageUpsert.CallAll(null, senderId, IndividualMsg, MsgType.Text, SenderType.Individual);
      resolve();
    }, secondsFromUserToSendMsgDelay * 1000);
  });
  const messageReceived: WAMessage = await Promise.all([msgWaitingPromise, userActuallySendsTheMsgPromise]).then(([msgResult]) => msgResult)
  //=============================================================
  const endTime: number = performance.now();
  const totalTimeMiliseconds: number = endTime - startTime;
  console.log(`WhatsSocketReceiver: Getting msg with delay from private chat: Took ${totalTimeMiliseconds} miliseconds to receive the message`);
  expect(messageReceived).toMatchObject(IndividualMsg);

  // Checking if inside margin error sending time
  expect(totalTimeMiliseconds).toBeGreaterThan((secondsFromUserToSendMsgDelay * 1000) - marginErrorMiliseconds);
  expect(totalTimeMiliseconds).toBeLessThan((secondsFromUserToSendMsgDelay * 1000) + marginErrorMiliseconds);
});

it.skipIf(skipLongTests)("WhenGettingBasicMsgWithDelay_FROMGROUP_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 0 });
  const receiver = new WhatsSocketReceiver_SubModule(mockSocket);

  const senderId: string = "999888777666@lid";
  const chatId: string = "123456789012345@g.us";
  const timeoutSecondsExpected: number = 5;
  const secondsFromUserToSendMsgDelay: number = 3;
  const marginErrorMiliseconds: number = 500;

  const startTime: number = performance.now();
  //=============================================================
  const msgWaitingPromise: Promise<WAMessage> = receiver.WaitUntilNextRawMsgFromUserIDInGroup(senderId, chatId, MsgType.Text, { ...WAITOPTIONS, timeoutSeconds: timeoutSecondsExpected });
  const userActuallySendsMsgWithDelayPromise: Promise<void> = new Promise((resolve) => {
    setTimeout(() => {
      mockSocket.onMessageUpsert.CallAll(senderId, chatId, Groupmsg, MsgType.Text, SenderType.Group);
      resolve();
    }, secondsFromUserToSendMsgDelay * 1000)
  });
  const messageReceived: WAMessage = await Promise.all([msgWaitingPromise, userActuallySendsMsgWithDelayPromise]).then(([waitedMsg, _void]) => waitedMsg);
  //=============================================================
  const endTime: number = performance.now();
  const totalTimeMiliseconds: number = endTime - startTime;
  console.log(`WhatsSocketReceiver: Getting msg with delay from group chat: Took ${totalTimeMiliseconds} miliseconds to receive the message`);

  expect(messageReceived).toBeDefined();
  expect(messageReceived).toMatchObject(Groupmsg);

  // Checking if inside margin error sending time
  expect(totalTimeMiliseconds).toBeGreaterThan((secondsFromUserToSendMsgDelay * 1000) - marginErrorMiliseconds);
  expect(totalTimeMiliseconds).toBeLessThan((secondsFromUserToSendMsgDelay * 1000) + marginErrorMiliseconds);
});

// it.skipIf(false)("WhenGettingIncorrectMsgType_ShouldIgnoreItAndKeepWaiting", async () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
//   const receive/**module*/ = new WhatsSocketReceiver_SubModule(mockSocket);

//   const userID = "999888777666@lid";
//   const chatID = "123456789012345@g.us";

//   //Testing how it works in groups as well
//   const msgWaitingPromise: Promise<WAMessage> = receive.WaitUntilNextRawMsgFromUserIDInGroup(userID, chatID, MsgType.Image, {
//     cancelKeywords: ["cancel", "cancelar"],
//     ignoreSelfMessages: true,
//     timeoutSeconds: 5,
//     wrongTypeFeedbackMsg: "Wrong msg type, expected an image"
//   })
// })


// it.skipIf(false)("Should reject messages of wrong type and accept the expected type", async () => {
//   const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
//   const receiver = new WhatsSocketReceiver_SubModule(mockSocket);
//   const senderId = "555123456789@s.whatsapp.net";

//   const timeoutSecondsExpected = 5;

//   // Promesa para enviar mensaje de tipo incorrecto primero
//   const wrongTypeMsgPromise = new Promise<void>((resolve) => {
//     setTimeout(() => {
//       mockSocket.onMessageUpsert.CallAll(null, senderId, IndividualMsg, MsgType.Image, SenderType.Individual);
//       resolve();
//     }, 1000);
//   });

//   // Promesa para enviar mensaje correcto
//   const correctMsgPromise = new Promise<void>((resolve) => {
//     setTimeout(() => {
//       mockSocket.onMessageUpsert.CallAll(null, senderId, IndividualMsg, MsgType.Text, SenderType.Individual);
//       resolve();
//     }, 2000);
//   });

//   const startTime = performance.now();
//   const msgWaitingPromise = receiver.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, {
//     cancelKeywords: ["cancelar"],
//     ignoreSelfMessages: true,
//     timeoutSeconds: timeoutSecondsExpected,
//     wrongTypeFeedbackMsg: "Debes de responder en formato de texto!"
//   });

//   // Esperamos todas las simulaciones de envío
//   await Promise.all([wrongTypeMsgPromise, correctMsgPromise]);

//   // El receptor debería resolver solo con el mensaje correcto
//   const receivedMsg = await msgWaitingPromise;
//   const endTime = performance.now();
//   const totalTimeMs = endTime - startTime;

//   expect(receivedMsg).toMatchObject(IndividualMsg);
//   // Debe haber esperado aproximadamente hasta el mensaje correcto (2s)
//   expect(totalTimeMs).toBeGreaterThan(1900);
//   expect(totalTimeMs).toBeLessThan(2500);
// });