import { expect, it } from "bun:test";
import { performance } from "node:perf_hooks";
import { skipLongTests } from "../../../Envs.js";
import {
  MockGroupTxtMsg_CHATID as GroupMsg_CHATID,
  MockGroupTxtMsg_SENDERID as GroupMsg_SENDERID,
  MockGroupTxtMsg as GroupTxtMsg,
  MockIndividualTxtMsg as IndividualTxtMsg,
  MockGroupTxtMsg_CHATID,
  MockGroupTxtMsg_SENDERID,
} from "../../../mocks/MockIndividualGroup.mock.js";
import { imageWithCaptionMsg } from "../../../mocks/MockManyTypesMsgs.mock.js";
import { MsgType, SenderType } from "../../../Msg.types.js";
import WhatsSocketMock from "../mocks/WhatsSocket.mock.js";
import type { WhatsappMessage } from "../types.js";
import { type WhatsSocketReceiverError, type WhatsSocketReceiverWaitOptions, WhatsSocket_Submodule_Receiver } from "./WhatsSocket.receiver.js";

/**TODO: List of things to test for receiving messages
 * WhatsSocketReceiver
 * === Basic ===
 * 1. [X] Receives the msg the moment it arrives (Works at least the basic feature expected, receive a msg)
 * 2. [X] Receives the msg the moment it arreives with delay time => e.g (user takes more than 2-3 seconds to send);
 * === Params ===
 * 1. [X] Doesn't accept messages with incorrect type
 *    - Must keep waiting until get correct type msg or timeout expires (what happens first)
 *    - Must succeed if it gets the correct msg before timeout occurs
 *    - 1.1 [X] Must send a wrongtypemsg string when incorrect type
 *
 * 2. [X] Uses cancel keywords
 *    - If user sends one of cancel keywords, the whole process is canceled and should not keep waiting for a msg
 *
 * 3. [X] Timeout waiting time
 *    - If timeout occurs, should cancel itself and stop waiting for msg from user, even though user sends a correct msg type after time
 */

const WAITOPTIONS: WhatsSocketReceiverWaitOptions = {
  cancelKeywords: ["cancel", "cancelar"],
  ignoreSelfMessages: true,
  timeoutSeconds: 5 /** Same as each test timeout default time (5 seconds) */,
  wrongTypeFeedbackMsg: "Generic error msg for wrong type receiver msg.... (change if needed)",
};

//========================= ===  MINIMUM FEATURE expected Testing (at least should receive messages without freeze or keep waiting infinitely) =========================
it("WhenGettingBasicMsg_FROMINDIVIDUAL_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive = new WhatsSocket_Submodule_Receiver(mockSocket);
  const senderId: string = "555123456789@s.whatsapp.net";
  const msgWaitingPromise: Promise<WhatsappMessage> = receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, WAITOPTIONS);
  const userSendingMsgPromise: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(null, null, senderId, IndividualTxtMsg, MsgType.Text, SenderType.Individual);
    resolve();
  });
  const waitedMsg: WhatsappMessage = await Promise.all([msgWaitingPromise, userSendingMsgPromise]).then(([waitedMsg, _void]) => waitedMsg);
  expect(waitedMsg).toBeDefined();
  expect(waitedMsg).toMatchObject(IndividualTxtMsg);
});

it("WhenGettingBasicMsg_FROMGROUP_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive = new WhatsSocket_Submodule_Receiver(mockSocket);
  const senderId: string = "999888777666@lid";
  const chatId: string = "123456789012345@g.us";
  const msgWaitingPromise: Promise<WhatsappMessage> = receive.WaitUntilNextRawMsgFromUserIDInGroup(senderId, null, chatId, MsgType.Text, WAITOPTIONS);
  const userFromGroupSendingMsgPromise: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(senderId, null, chatId, GroupTxtMsg, MsgType.Text, SenderType.Group);
    resolve();
  });
  const waitedMsg: WhatsappMessage = await Promise.all([msgWaitingPromise, userFromGroupSendingMsgPromise]).then(([waitedMsg, _void]) => waitedMsg);
  expect(waitedMsg).toBeDefined();
  expect(waitedMsg).toMatchObject(GroupTxtMsg);
});

it("Only original sender can cancel waiting msg", async (): Promise<void> => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const receive = new WhatsSocket_Submodule_Receiver(mockSocket);

  const originalSenderId = GroupMsg_SENDERID;
  const notRelatedSenderId = "123_NOT_RELATED_@lid";
  const main: Promise<WhatsappMessage> = receive.WaitUntilNextRawMsgFromUserIDInGroup(originalSenderId, null, GroupMsg_CHATID, MsgType.Image, {
    ...WAITOPTIONS,
    cancelKeywords: ["cancel", "cancelar"],
  });
  const msg: Promise<void> = new Promise<void>((resolve) => {
    // Non waiting-related msg with "cancel" text. Should be ignored
    mockSocket.MockSendMsg(GroupTxtMsg, { replaceParticipantIdWith: notRelatedSenderId, replaceTextWith: "cancel", customMsgType: MsgType.Text });
    // Expected user!
    mockSocket.MockSendMsg(GroupTxtMsg, { replaceParticipantIdWith: originalSenderId, replaceTextWith: "cancel", customMsgType: MsgType.Text });
    resolve();
  });

  let error: WhatsSocketReceiverError | null = null;
  let waitedMsg: WhatsappMessage | undefined;
  try {
    waitedMsg = await Promise.all([main, msg]).then(([waitedMessage, _void]) => waitedMessage);
    throw new Error("Should be rejected!");
  } catch (e) {
    error = e as WhatsSocketReceiverError;
  }

  expect(error).toBeDefined();
  expect(waitedMsg).not.toBeDefined();
  expect(error).toMatchObject({
    wasAbortedByUser: true,
    errorMessage: "User has canceled the dialog",
  });
  expect(error?.chatId).toBe(GroupMsg_CHATID);
  expect(error?.participantId_LID).toBe(originalSenderId); //Should be cancelled by expecting "waitedMsg" promise to be rejected
});

//=========================  MINIMUM FEATURE (like before) with Delays timers inside timeout time range | LONG TESTS =========================
it.skipIf(skipLongTests)("WhenGettingBasicMsgWithDelay_FROMINDIVIDUAL_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0, maxQueueLimit: 10 });
  const receive /**module*/ = new WhatsSocket_Submodule_Receiver(mockSocket);

  const senderId: string = "555123456789@s.whatsapp.net";
  const secondsFromUserToSendMsgDelay: number = 3;
  const timeoutSecondsExpected: number = 5;
  const marginErrorMiliseconds: number = 500;

  const startTime: number = performance.now();
  //=============================================================
  const msgWaitingPromise: Promise<WhatsappMessage> = receive.WaitUntilNextRawMsgFromUserIdInPrivateConversation(senderId, MsgType.Text, {
    ...WAITOPTIONS,
    timeoutSeconds: timeoutSecondsExpected,
  });
  const userActuallySendsTheMsgPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      mockSocket.onIncomingMsg.CallAll(null, null, senderId, IndividualTxtMsg, MsgType.Text, SenderType.Individual);
      resolve();
    }, secondsFromUserToSendMsgDelay * 1000);
  });
  const messageReceived: WhatsappMessage = await Promise.all([msgWaitingPromise, userActuallySendsTheMsgPromise]).then(([msgResult]) => msgResult);
  //=============================================================
  const endTime: number = performance.now();
  const totalTimeMiliseconds: number = endTime - startTime;
  console.log(`WhatsSocketReceiver: Getting msg with delay from private chat: Took ${totalTimeMiliseconds} miliseconds to receive the message`);
  expect(messageReceived).toMatchObject(IndividualTxtMsg);

  // Checking if inside margin error sending time
  expect(totalTimeMiliseconds).toBeGreaterThan(secondsFromUserToSendMsgDelay * 1000 - marginErrorMiliseconds);
  expect(totalTimeMiliseconds).toBeLessThan(secondsFromUserToSendMsgDelay * 1000 + marginErrorMiliseconds);
});

it.skipIf(skipLongTests)("WhenGettingBasicMsgWithDelay_FROMGROUP_ShouldReceiveItAtTheMomentBeingSent (Expected Minimum Features)", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 0 });
  const receiver = new WhatsSocket_Submodule_Receiver(mockSocket);

  const senderId: string = "999888777666@lid";
  const chatId: string = "123456789012345@g.us";
  const timeoutSecondsExpected: number = 5;
  const secondsFromUserToSendMsgDelay: number = 3;
  const marginErrorMiliseconds: number = 500;

  const startTime: number = performance.now();
  //=============================================================
  const msgWaitingPromise: Promise<WhatsappMessage> = receiver.WaitUntilNextRawMsgFromUserIDInGroup(senderId, null, chatId, MsgType.Text, {
    ...WAITOPTIONS,
    timeoutSeconds: timeoutSecondsExpected,
  });
  const userActuallySendsMsgWithDelayPromise: Promise<void> = new Promise((resolve) => {
    setTimeout(() => {
      mockSocket.onIncomingMsg.CallAll(senderId, null, chatId, GroupTxtMsg, MsgType.Text, SenderType.Group);
      resolve();
    }, secondsFromUserToSendMsgDelay * 1000);
  });
  const messageReceived: WhatsappMessage = await Promise.all([msgWaitingPromise, userActuallySendsMsgWithDelayPromise]).then(([waitedMsg, _void]) => waitedMsg);
  //=============================================================
  const endTime: number = performance.now();
  const totalTimeMiliseconds: number = endTime - startTime;
  console.log(`WhatsSocketReceiver: Getting msg with delay from group chat: Took ${totalTimeMiliseconds} miliseconds to receive the message`);

  expect(messageReceived).toBeDefined();
  expect(messageReceived).toMatchObject(GroupTxtMsg);

  // Checking if inside margin error sending time
  expect(totalTimeMiliseconds).toBeGreaterThan(secondsFromUserToSendMsgDelay * 1000 - marginErrorMiliseconds);
  expect(totalTimeMiliseconds).toBeLessThan(secondsFromUserToSendMsgDelay * 1000 + marginErrorMiliseconds);
});

it.skipIf(skipLongTests)("WhenGettingIncorrectMsgType_FROMGROUP_ShouldIgnoreItAndKeepWaiting", async () => {
  //Arrange
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const receive /**module*/ = new WhatsSocket_Submodule_Receiver(mockSocket);

  const timeoutSeconds: number = 2;
  const userID = "999888777666@lid";
  const chatID = "123456789012345@g.us";

  const startTime = performance.now();
  const msgWaitingPromise: Promise<WhatsappMessage> = receive.WaitUntilNextRawMsgFromUserIDInGroup(userID, null, chatID, MsgType.Text, {
    ...WAITOPTIONS,
    timeoutSeconds,
  });

  //Act
  //Should not expect any of these messages (types)                                       //No. of messages sent (incorrect)
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Image, SenderType.Group); //1
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Contact, SenderType.Group); //2
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Sticker, SenderType.Group); //3
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Video, SenderType.Group); //4
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Audio, SenderType.Group); //5

  let error: WhatsSocketReceiverError | undefined;
  try {
    await msgWaitingPromise;
  } catch (e) {
    error = e as WhatsSocketReceiverError;
  }
  const endTime: number = performance.now();
  const totalTimeInMs = endTime - startTime;

  //Check
  expect(error).toBeDefined();
  expect(error).toMatchObject({
    wasAbortedByUser: false,
    errorMessage: "User didn't responded in time",
  });
  //Expected in range +-250ms to be rejected
  expect(totalTimeInMs).toBeGreaterThan(timeoutSeconds * 1000 - 250);
  expect(totalTimeInMs).toBeLessThan(timeoutSeconds * 1000 + 250);
  expect(mockSocket.SentMessagesThroughQueue.length).toBe(5); //5 msgs incorrect sent
  for (const msgSentFrom of mockSocket.SentMessagesThroughQueue) {
    expect(msgSentFrom.content).toMatchObject({
      text: "Generic error msg for wrong type receiver msg.... (change if needed)",
    });
  }
});

it.skipIf(skipLongTests)("WhenExpectingMsgAndUserSendsACancelWord_FROMGROUP_ShouldRecognizeCancelWorldAndCancelWaiting", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const receiver = new WhatsSocket_Submodule_Receiver(mockSocket);

  const userID = "999888777666@lid";
  const chatID = "123456789012345@g.us";
  const cancelWords: string[] = ["cancel", "cancelar"];

  const waitingMsgPromise: Promise<WhatsappMessage> = receiver.WaitUntilNextRawMsgFromUserIDInGroup(userID, null, chatID, MsgType.Image, {
    ...WAITOPTIONS,
    cancelKeywords: cancelWords,
  });
  const msgsPromise: Promise<void> = new Promise<void>((resolve) => {
    mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Text, SenderType.Group); //Wrong msg
    mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Text, SenderType.Group); //Wrong msg
    const cancelKeywordMockMsg: WhatsappMessage = {
      key: {
        fromMe: false,
        participant: userID,
        remoteJid: chatID,
      },
      message: {
        conversation: "I'd like to cancel this command", //Should recognize cancel inside the text, not strictly "cancel" or any other keyword
      },
    };
    //Even though its not a MsgType.Image, socket should have priority looking for cancel words before checking type (to be able to cancel)
    mockSocket.onIncomingMsg.CallAll(userID, null, chatID, cancelKeywordMockMsg, MsgType.Text, SenderType.Group);
    resolve();
  });

  let error: WhatsSocketReceiverError | undefined;
  try {
    await Promise.all([waitingMsgPromise, msgsPromise]);
  } catch (e) {
    error = e as WhatsSocketReceiverError;
  }

  expect(error).toBeDefined();
  expect(error!).toMatchObject({
    wasAbortedByUser: true,
    errorMessage: "User has canceled the dialog",
  });

  //Expecting the socket has sent two first wrong type errors.
  expect(mockSocket.SentMessagesThroughQueue.length).toBe(2);
  expect(mockSocket.SentMessagesThroughQueue[0]).toMatchObject({
    chatId: chatID,
    content: {
      text: "Generic error msg for wrong type receiver msg.... (change if needed)",
    },
    miscOptions: undefined,
  });
  expect(mockSocket.SentMessagesThroughQueue[1]).toMatchObject({
    chatId: chatID,
    content: {
      text: "Generic error msg for wrong type receiver msg.... (change if needed)",
    },
    miscOptions: undefined,
  });
});

it.skipIf(skipLongTests)("WhenTimeoutExpiresAndAfterSendingGoodMsgType_FROMGROUP_ShouldContinueAsUsualAndIgnoreGoodMsgType", async () => {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
  const receiver = new WhatsSocket_Submodule_Receiver(mockSocket);

  const userID = "999888777666@lid";
  const chatID = "123456789012345@g.us";

  const waitingMsgPromise: Promise<WhatsappMessage> = receiver.WaitUntilNextRawMsgFromUserIDInGroup(userID, null, chatID, MsgType.Image, {
    ...WAITOPTIONS,
    timeoutSeconds: 3,
  });

  //Sending many wrong msgs (to simulate bad interaction from user) None of these are Images
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Text, SenderType.Group);
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Sticker, SenderType.Group);
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Video, SenderType.Group);
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Ubication, SenderType.Group);

  let awaitedMsg: WhatsappMessage | undefined;
  let error: WhatsSocketReceiverError | undefined;
  try {
    awaitedMsg = await waitingMsgPromise;
  } catch (e) {
    error = e as WhatsSocketReceiverError;
  }

  expect(awaitedMsg).toBeUndefined();
  expect(error).toBeDefined();
  expect(error!).toMatchObject({ wasAbortedByUser: false, errorMessage: "User didn't responded in time" });
  expect(mockSocket.SentMessagesThroughQueue.length).toBe(4);
  for (const msgSentFrom of mockSocket.SentMessagesThroughQueue) {
    expect(msgSentFrom.content).toMatchObject({
      text: "Generic error msg for wrong type receiver msg.... (change if needed)",
    });
  }

  //No user sends a correct image message (should be ignored, not waited at all)
  mockSocket.onIncomingMsg.CallAll(userID, null, chatID, GroupTxtMsg, MsgType.Image, SenderType.Group);
  //Should continue being undefined
  expect(awaitedMsg).toBeUndefined();
  //Should not send any other msg (like feedback or any other thing)
  expect(mockSocket.SentMessagesThroughQueue.length).toBe(4);
});

//Long 6Seconds test
it.skipIf(skipLongTests)(
  "WhenWaitingForMsgAndRespondendWithNoExcpectedType_FROMGROUP_ShouldResetTimeoutCounter",
  async () => {
    const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 1, maxQueueLimit: 10 });
    const receiver = new WhatsSocket_Submodule_Receiver(mockSocket);

    const TIMEOUT_MS: number = 3 * 1000;
    const waiting = receiver.WaitUntilNextRawMsgFromUserIDInGroup(MockGroupTxtMsg_SENDERID, null, MockGroupTxtMsg_CHATID, MsgType.Image, {
      timeoutSeconds: TIMEOUT_MS,
      cancelKeywords: ["cancel"],
      ignoreSelfMessages: true,
      cancelFeedbackMsg: "Cancel feeback msg mock text msg",
      wrongTypeFeedbackMsg: "I was expecting an image msg!, try again",
    });

    //All this code should not throw
    //Should expand more than 3 seconds delay, aprox 6sec  e.g(if TIMEOUTSECS = 3)
    expect(async () => {
      await new Promise<void>((r) => setTimeout(r, TIMEOUT_MS - 100));
      await mockSocket.MockSendMsgAsync(GroupTxtMsg);
      expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
      expect(mockSocket.SentMessagesThroughQueue[0]!.content).toMatchObject({
        text: "I was expecting an image msg!, try again",
      });
      await new Promise<void>((r) => setTimeout(r, TIMEOUT_MS - 100));
      await mockSocket.MockSendMsgAsync(imageWithCaptionMsg, { replaceChatIdWith: MockGroupTxtMsg_CHATID, replaceParticipantIdWith: MockGroupTxtMsg_SENDERID });
      //Should not send any more msg feedback, all correct. Same length as before
      expect(mockSocket.SentMessagesThroughQueue).toHaveLength(1);
      await waiting;
    }).not.toThrow();
  },
  8000
);
