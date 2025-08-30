import { describe, it, expect } from "bun:test";
import { type WAMessage } from "baileys";
import WhatsSocketMock from '../mocks/WhatsSocket.mock';
import { WhatsSocketReceiver_SubModule } from './WhatsSocket.receiver';
import { IndividualMsg } from 'src/helpers/Whatsapp.helper.mocks';
import { MsgType, SenderType } from 'src/Msg.types';
import { performance } from "node:perf_hooks";
import { skipLongTests } from 'src/Envs';


//With individual chats should work as well
//TODO: Use skipLongTests variable when finishing this tests
it.skipIf(false)("WhenGettingBasicMsg_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive/**module*/ = new WhatsSocketReceiver_SubModule(mockSocket);
  const senderId: string = "555123456789@s.whatsapp.net";

  const secondsFromUserToSendMsg: number = 3;
  const timeoutSecondsExpected: number = 5;

  const startTime: number = performance.now();
  const msgWaitingPromise: Promise<WAMessage> = receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, {
    cancelKeywords: ["cancelar"],
    ignoreSelfMessages: true,
    timeoutSeconds: timeoutSecondsExpected,
    wrongTypeFeedbackMsg: "Debes de responder en formato de texto!"
  });
  const userActuallySendsTheMsgPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      mockSocket.onMessageUpsert.CallAll(null, senderId, IndividualMsg, MsgType.Text, SenderType.Individual);
      resolve();
    }, secondsFromUserToSendMsg * 1000);
  });

  const messageReceived: WAMessage = await Promise.all([msgWaitingPromise, userActuallySendsTheMsgPromise]).then(([msgResult]) => msgResult)
  const endTime: number = performance.now();

  const totalTimeMiliseconds: number = endTime - startTime;
  console.log(`Took ${totalTimeMiliseconds} miliseconds to receive the message. (Without sender delay)`);
  expect(messageReceived).toMatchObject(IndividualMsg);

  // 500 miliseconds margin error
  expect(totalTimeMiliseconds).toBeGreaterThan((secondsFromUserToSendMsg * 1000) - 500);
  expect(totalTimeMiliseconds).toBeLessThan((secondsFromUserToSendMsg * 1000) + 500);
});

it.skipIf(false)("WhenGettingIncorrectMsgType_ShouldIgnoreItAndKeepWaiting", async () => {

})


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