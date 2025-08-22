import { beforeEach, it, describe, expect } from "bun:test";
import WhatsSocketMockMinimum from '../mocks/WhatsSocket.minimum.mock';
import { WhatsAppGroupIdentifier } from '../../../Whatsapp.types';
import WhatsSocketSenderQueue from './WhatsSocket.senderqueue';
import { performance } from "node:perf_hooks";
import { skipLongTests } from 'src/Envs';

const fakeChatId: string = "23423423234" + WhatsAppGroupIdentifier;

describe("Enqueue", () => {
  let mockSocket: WhatsSocketMockMinimum
  let queue: WhatsSocketSenderQueue;

  beforeEach(() => {
    mockSocket = new WhatsSocketMockMinimum();
    queue = new WhatsSocketSenderQueue(mockSocket, 5, 1);
  });

  it("WhenSendingSimpleTxtMsg_ShouldEmptyTheQueueAfterProcessing", async () => {
    await queue.Enqueue(fakeChatId, { text: "Simple txt message" });
    expect(queue.ActualElementsInQueue.length).toBe(0);
  });

  it("WhenSendingThreeSimpleTxtMsg_ShouldSendThemAll", async () => {
    await queue.Enqueue(fakeChatId, { text: "First" });
    await queue.Enqueue(fakeChatId, { text: "Second" });
    await queue.Enqueue(fakeChatId, { text: "Third" });
    expect(mockSocket.SentMessages.length).toBe(3);
  });

  it("WhenSendingMsgsWithoutStart_ShouldAcumulateThemAndSendThemAfterContinue", async () => {
    const originalQueue = queue;
    queue = new WhatsSocketSenderQueue(mockSocket, 5, 1);
    queue.StopGracefully();
    queue.Enqueue(fakeChatId, { text: "First" });
    queue.Enqueue(fakeChatId, { text: "Second" });
    queue.Enqueue(fakeChatId, { text: "Third" });
    expect(queue.ActualElementsInQueue.length).toBe(3);
    expect(mockSocket.SentMessages.length).toBe(0);
    await queue.Continue();
    expect(queue.ActualElementsInQueue.length).toBe(0);
    expect(mockSocket.SentMessages.length).toBe(3);
    queue = originalQueue;
  });

  it("WhenSendingSimpleTxtMsg_ShouldAlwaysUseRawSendMethodFromSocket", async () => {
    await queue.Enqueue(fakeChatId, { text: "Check method" });
    for (const sentMsg of mockSocket.SentMessages) {
      expect(sentMsg.isRawMsg).toBe(true);
    }
  });

  //This test will last at least 1.4 seconds due to it's nature
  //This will be runned with SKIP_LONG_TESTS env variable is false or undefined. Check the .env file if you want to run these long tests
  it.skipIf(skipLongTests)("LONG_WhenSendingMsgsWithDelay_ShouldSendMessagesWithThatDelayMilisecondsBetween", async () => {
    const originalQueue = queue;
    const milisecondsDelayBetweenMsgs: number = 1500;

    queue = new WhatsSocketSenderQueue(mockSocket, /** Max Queue messages: */ 5, milisecondsDelayBetweenMsgs);
    queue.StopGracefully();
    queue.Enqueue(fakeChatId, { text: "First" });
    queue.Enqueue(fakeChatId, { text: "Second" });
    queue.Enqueue(fakeChatId, { text: "Third" });
    queue.Enqueue(fakeChatId, { text: "Fourth" });
    queue.Enqueue(fakeChatId, { text: "Fifth" });
    expect(queue.ActualElementsInQueue.length).toBe(5);

    let itsFirstMsg: boolean = true;
    let startTimer: number;
    let result: number;

    queue.onMessageSent.Subscribe(() => {
      const endTimer: number = performance.now();
      result = endTimer - startTimer!; //Elapsed time (ms) for the message to be sent
      console.log("Message Sent: " + result + " miliseconds");
      if (!itsFirstMsg)
        expect(result).toBeGreaterThanOrEqual(milisecondsDelayBetweenMsgs - 10 /** little threshold in case it goes a little faster than expected (little means by +-10 ms) */);
      else
        itsFirstMsg = false;
      //Resets for the incoming msg
      startTimer = performance.now();
    });

    startTimer = performance.now();
    await queue.Continue();
    queue = originalQueue;
  }, { timeout: 15000 })

  it("WhenSendingMoreMsgsThanQueueLimit_ShouldNotSendExtraMsgsAndNotGrowQueue", async () => {
    const originalQueue = queue;
    const MAXQUEUELIMIT = 6;
    queue = new WhatsSocketSenderQueue(mockSocket, MAXQUEUELIMIT, 20);
    queue.StopGracefully();
    queue.Enqueue(fakeChatId, { text: "First Message" });
    queue.Enqueue(fakeChatId, { text: "Second Message" });
    queue.Enqueue(fakeChatId, { text: "Third Message" });
    await queue.Continue();//Wait to send those 3 messages first
    queue.Enqueue(fakeChatId, { text: "Forth Message" });
    queue.Enqueue(fakeChatId, { text: "Fifth Message" });
    queue.Enqueue(fakeChatId, { text: "Sixth Message" });
    queue.Enqueue(fakeChatId, { text: "Seventh Message" });
    queue.Enqueue(fakeChatId, { text: "Eight Message" });
    queue.Enqueue(fakeChatId, { text: "Ninth Message" }); //Limit here
    queue.Enqueue(fakeChatId, { text: "Tenth Message" });
    queue.Enqueue(fakeChatId, { text: "Eleventh Message" });
    expect(queue.ActualElementsInQueue.length).toBe(6)
    queue = originalQueue;
  });

  //================== Now using all types of msgs =======================
  //TODO: Make every type of message mock but sending (mocks). Note: this will be tested after WhatsSocket.sugarsenders.ts
});

