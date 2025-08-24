import type { AnyMessageContent, GroupMetadata, WAMessage } from 'baileys';
import { type Mock, mock as fn, expect, describe, it, spyOn } from "bun:test";
import type { BaileysWASocket } from './types';

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

import WhatsSocket from './WhatsSocket';

describe('WhatsSocket', () => {
  it('should send a message safely via queue', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const result: WAMessage | null = await ws.SendSafe('123@c.us', { text: 'Hello' });
    //@ts-ignore
    expect(result?.message).toEqual({ text: 'Hello' });
    expect(internalMockSocket.sendMessage as Mock<typeof internalMockSocket.sendMessage>).toHaveBeenCalledTimes(1);
  });

  it('should fetch group metadata', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });

    const group = await ws.GetGroupMetadata('123@g.us');
    expect(group.subject).toBe('Mock Group');
    expect(mockSocket.groupMetadata).toHaveBeenCalledOnce();
  });

  it('should call delegates on incoming message', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ milisecondsDelayBetweenSentMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });


    const spy = fn();
    ws.onMessageUpsert.Subscribe(spy);

    // simulate message received
    const message = { key: { remoteJid: '123@c.us', fromMe: false }, message: { text: 'Hi' } } as WAMessage;
    await (mockSocket.ev.on as any).mock.calls.find(([event]) => event === 'messages.upsert')[1]({ messages: [message] });

    expect(spy).toHaveBeenCalledOnce();
  });
});
