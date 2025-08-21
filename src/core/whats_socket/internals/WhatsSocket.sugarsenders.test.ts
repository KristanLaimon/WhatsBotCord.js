import { WhatsAppGroupIdentifier } from 'src/Whatsapp.types';
import { it, test, expect, describe, mockModule, clearAllMocks, beforeAll, beforeEach } from "../../../TestSuite";
import WhatsSocketMinimum from '../mocks/WhatsSocket.minimum.mock';
import WhatsSocketMock from '../mocks/WhatsSocket.mock';
import { WhatsSocketSugarSender } from './WhatsSocket.sugarsenders';


const fakeChatId = "338839029383" + WhatsAppGroupIdentifier;

describe("Text", () => {
  const mockWhatsSocket = new WhatsSocketMock({ maxQueueLimit: 20, minimumSecondsDelayBetweenMsgs: 1 /** To make tests faster */ });
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
  })

  it("WhenSendingSimplestTxtMsg_ShouldSendIt", async () => {
    await sender.Text(fakeChatId, "First Message");
    await sender.Text(fakeChatId, "Second Message");

    expect(mockWhatsSocket.SentMessagesHistoryReadOnly.length).toBe(2);
  });

  it("WhenSendingTxtMsgWithNormalizedOption_ShouldSendItNormalized", async () => {
    await sender.Text(fakeChatId, "     \n\nFirst Message             \n\n\n", { normalizeMessageText: true })
    await sender.Text(fakeChatId, "\n\n                                Second message           \n\n\n\n             Hello", { normalizeMessageText: true })
    expect(mockWhatsSocket.SentMessagesHistoryReadOnly.length).toBe(2);
    //@ts-expect-error Idk why typescript says .text doesn't exist, when it actually does...
    expect(mockWhatsSocket.SentMessagesHistoryReadOnly[0]!.content.text).toBe("First Message");
    //@ts-expect-error Same...
    expect(mockWhatsSocket.SentMessagesHistoryReadOnly[1]!.content.text).toBe("Second message\n\n\n\nHello")
  });

  it("WhenSendingTxtMsgWith", async () => {

  });
})

