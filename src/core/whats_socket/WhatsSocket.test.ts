import type { AnyMessageContent, GroupMetadata, WAMessage } from 'baileys';
import { type Mock, mock as fn, expect, describe, it } from "bun:test";
import type { BaileysWASocket } from './types';
import WhatsSocket from './WhatsSocket';
import WhatsSocketSenderQueue from './internals/WhatsSocket.senderqueue';
import { WhatsSocketSugarSender } from './internals/WhatsSocket.sugarsenders';
import { WhatsAppGroupIdentifier } from 'src/Whatsapp.types';

export function CreateBaileysWhatsappMockSocket(): BaileysWASocket {
  return {
    user: { id: 'mock-jid' },
    sendMessage: fn(async (jid: string, content: AnyMessageContent) => {
      return { key: { remoteJid: jid, fromMe: false }, message: content } as WAMessage;
    }),
    groupMetadata: fn(async (chatId: string) => ({
      id: chatId,
      subject: 'Mock Group',
      creation: Date.now(),
      creator: 'mock-user'
    } as unknown as GroupMetadata)),
    ev: {
      on: fn(),
    },
    ws: { close: fn(async () => Promise.resolve()) },
  } as unknown as BaileysWASocket;
}


describe("Initialization", () => {
  it("Instatiation_WhenProvidingMockSocket_ShouldUseMockInsteadOfRealOne", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 1, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();
    //@ts-ignore
    expect(ws._socket).toMatchObject(internalMockSocket);
  })

  it("Instatiation_WhenUsingStartMethod_ShouldSubscribeToCredsUpdateSocket", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, milisecondsDelayBetweenSentMsgs: 1 });
    await ws.Start();
    //internalMockSocket.ev.on should be called with 2 arguments: "creds.update", "saveCreds" async function from baileys
    //We're interested only on creds.update
    const argumentsArray = (internalMockSocket.ev.on as Mock<typeof internalMockSocket.ev.on>).mock.calls[0]!;
    const firstArgumentStr = argumentsArray[0];
    // const secondArgumentSaveCredsAsync = argumentsArray[1]; ||| Not used at all
    expect(firstArgumentStr).toBeDefined();
    expect(firstArgumentStr).toBe("creds.update");
  });

  it("WhenInstatiating_ShouldCreateQueueSocketAndSocketSugarSender", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, milisecondsDelayBetweenSentMsgs: 1 });
    await ws.Start();

    //Private field Senderqueue should be instatiated as well
    //@ts-ignore
    expect(ws._senderQueue).toBeDefined();
    //@ts-ignore
    expect(ws._senderQueue).toBeInstanceOf(WhatsSocketSenderQueue);
    expect(ws.Send).toBeDefined();
    expect(ws.Send).toBeInstanceOf(WhatsSocketSugarSender);
  });

  it("WhenInstatiatin_ShouldConfigure;ConfigureConnection();CorrectlyOnSocket", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, milisecondsDelayBetweenSentMsgs: 1 });
    await ws.Start();

    /**
     * We expect it's internal private method "ConfigureConnection()" uses the
     * 'connection.update' event from socket at least!
     */
    const argumentsCalledWith = (internalMockSocket.ev.on as Mock<typeof internalMockSocket.ev.on>).mock.calls.map(call => ({ EventName: call[0], Callback: call[1] }));
    expect(argumentsCalledWith).toBeDefined();
    const eventNameCalled = argumentsCalledWith.find(call => call.EventName === "creds.update");
    expect(eventNameCalled).toBeDefined();
    //So, from all calls it should at least call the "creds.update"!
  });
});

describe('Messages Sending', () => {
  it('WhenSendingMsgsThroughSendSafe_ShouldSendThemThroughSocket', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();
    const result: WAMessage | null = await ws.SendSafe('123@c.us', { text: 'Hello' });
    //@ts-ignore
    expect(result?.message).toEqual({ text: 'Hello' });
    expect(internalMockSocket.sendMessage as Mock<typeof internalMockSocket.sendMessage>).toHaveBeenCalledTimes(1);
  });
});

describe("Events/Delegates", () => {
  it('should call delegates on incoming message', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const spy = fn();
    ws.onSentMessage.Subscribe(spy);

    // simulate message received
    await ws.Send.Text("fakeChatId" + WhatsAppGroupIdentifier, "Hi");

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("Info fetching", () => {
  it('WhenTryingToFetchGroupsData_ShouldFetchThemCorrectlyFromSocket', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const group = await ws.GetGroupMetadata('123@g.us');
    expect(group.subject).toBe('Mock Group');
    expect(internalMockSocket.groupMetadata as Mock<typeof internalMockSocket.groupMetadata>).toHaveBeenCalledTimes(1);
  });
});