import { test, it, describe, expect } from "@/TestSuite";
import WhatsSocketMock from './mocks/WhatsSocket.mock';
import WhatsSocketSenderQueue from '../WhatsSocket.senderqueue';
// import WhatsSocketMock from './WhatsSocket.mock';
// import WhatsSocketSenderQueue from './WhatsSocket.senderqueue';

// const rawSocketMocked = new WhatsSocketMock();

describe("Enqueue", () => {
  it("WhenQueueingWithNoRefill;BelowMaxQueueLimit_ShouldExecuteAllQueuedTasks", () => {
    // Its ok if after all queued executions this have all messagesSent
    const mockSocket = new WhatsSocketMock({ maxQueueLimit: 5, minimumSecondsDelayBetweenMsgs: 5 /** To make this test faster */ });
    const queue = new WhatsSocketSenderQueue()

  });
});
