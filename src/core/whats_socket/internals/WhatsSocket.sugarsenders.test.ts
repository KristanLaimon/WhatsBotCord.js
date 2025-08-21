import { WhatsAppGroupIdentifier } from 'src/Whatsapp.types';
import { it, expect, describe, beforeEach } from "bun:test";
import { WhatsSocketSugarSender } from './WhatsSocket.sugarsenders';
import WhatsSocketMockMinimum from '../mocks/WhatsSocket.minimum.mock';

const fakeChatId = "338839029383" + WhatsAppGroupIdentifier;

describe("Text", () => {
  const mockWhatsSocket = new WhatsSocketMockMinimum();
  const sender = new WhatsSocketSugarSender(mockWhatsSocket);

  beforeEach(() => {
    mockWhatsSocket.ClearMock();
  })

  it("WhenSendingSimplestTxtMsg_ShouldSendIt", async () => {
    await sender.Text(fakeChatId, "First Message");
    await sender.Text(fakeChatId, "Second Message");
    expect(mockWhatsSocket.SentMessages.length).toBe(2);
  });

  it("WhenSendingTxtMsgWithNormalizedOption_ShouldSendItNormalized", async () => {
    await sender.Text(fakeChatId, "     \n\nFirst Message             \n\n\n", { normalizeMessageText: true })
    await sender.Text(fakeChatId, "\n\n                                Second message           \n\n\n\n             Hello", { normalizeMessageText: true })
    expect(mockWhatsSocket.SentMessages.length).toBe(2);
    //@ts-expect-error Idk why typescript says .text doesn't exist, when it actually does...
    expect(mockWhatsSocket.SentMessages[0]!.content.text).toBe("First Message");
    //@ts-expect-error Same...
    expect(mockWhatsSocket.SentMessages[1]!.content.text).toBe("Second message\n\n\n\nHello")
  });

  it("WhenSendingTxtMsgQueuedRaw_ShouldBeSendThroughSendRawFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: true });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: true });
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(true);
    }
  });

  it("WhenSendingTxtMsgQueued_ShouldBeSendThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Second msg", { sendRawWithoutEnqueue: false });
    await sender.Text(fakeChatId, "Third msg", { sendRawWithoutEnqueue: false });
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(false);
    }
  });

  it("WhenSendingTxtMsgQueuedWithNoExtraOptiosn;Default;_ShouldBeSentThroughSendSafeFromSocket", async () => {
    await sender.Text(fakeChatId, "First msg default");
    await sender.Text(fakeChatId, "Second msg default");
    await sender.Text(fakeChatId, "Third msg default");
    for (const msgSent of mockWhatsSocket.SentMessages) {
      expect(msgSent.isRawMsg).toBe(false);
    }
  });
})

