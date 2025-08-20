import { beforeEach, it, describe, expect } from "../../TestSuite";
import WhatsSocketSenderQueue from './WhatsSocket.senderqueue';
import WhatsSocketMinimum from './internal_tests/WhatsSocket.minimum.mock';
import { WhatsAppGroupIdentifier } from '../../Whatsapp.types';

// import { txtMsgs, noTxtMsgs, allMockMsgs } from "../../helpers/Msg.helper.mocks"

const fakeChatId: string = "23423423234" + WhatsAppGroupIdentifier;

describe("Enqueue", () => {
  let mockSocket: WhatsSocketMinimum
  let queue: WhatsSocketSenderQueue;

  beforeEach(() => {
    mockSocket = new WhatsSocketMinimum();
    queue = new WhatsSocketSenderQueue(mockSocket, 5, 200);
  });

  it("WhenSendingSimpleTxtMsg_ShouldEmptyTheQueueAfterProcessing", async () => {
    await queue.Enqueue(fakeChatId, { text: "Simple txt message" });
    expect(queue.ActualElementsInQueue.length).toBe(0);
  });

  it("WhenSendingThreeSimpleTxtMsg_ShouldSendThemAll", async () => {
    await queue.Enqueue(fakeChatId, { text: "First" });
    await queue.Enqueue(fakeChatId, { text: "Second" });
    await queue.Enqueue(fakeChatId, { text: "Third" });
    expect(mockSocket.MessagesSentHistory.length).toBe(3);
  });

  it("WhenSendingSimpleTxtMsg_ShouldAlwaysUseRawSendMethodFromSocket", async () => {
    await queue.Enqueue(fakeChatId, { text: "Check method" });
    for (const sentMsg of mockSocket.MessagesSentHistory) {
      expect(sentMsg.isRawMsg).toBe(true);
    }
  });

  //================== Now using all types of msgs =======================
  //TODO: Make every type of message mock but sending (mocks)
});

