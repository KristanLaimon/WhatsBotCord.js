import type { AnyMessageContent, GroupMetadata, MiscMessageGenerationOptions, WAMessage } from "baileys";
import { type Mock, mock as fn } from "bun:test";
import type { IWhatsSocketServiceAdapter } from "./WhatsSocket.types.js";

/**
 * A mock implementation of the minimal socket interface.
 * Fully reproduces `CreateBaileysWhatsappMockSocket` functionality.
 */
export class BaileysSocketServiceAdapter_Mock implements IWhatsSocketServiceAdapter {
  public user = { id: "mock-jid" };

  // Storage for event subscribers
  private storedEvents: Map<string, Array<(...args: any[]) => void>> = new Map();

  // Mocks for sendMessage and other async methods
  public sendMessage: Mock<IWhatsSocketServiceAdapter["sendMessage"]> = fn(
    async (jid: string, content: AnyMessageContent, _options?: MiscMessageGenerationOptions) => {
      return {
        key: { remoteJid: jid, fromMe: false },
        message: content,
      } as WAMessage;
    }
  );

  public groupMetadata: Mock<IWhatsSocketServiceAdapter["groupMetadata"]> = fn(
    async (chatId: string) =>
      ({
        id: chatId,
        subject: "Mock Group",
        creation: Date.now(),
        creator: "mock-user",
      }) as unknown as GroupMetadata
  );

  public groupFetchAllParticipating: Mock<IWhatsSocketServiceAdapter["groupFetchAllParticipating"]> = fn(async () => {
    return {}; // fake group list
  });

  // Event system fully mocked
  public ev = {
    on: fn<IWhatsSocketServiceAdapter["ev"]["on"]>((eventName, callback) => {
      if (!this.storedEvents.has(eventName)) {
        this.storedEvents.set(eventName, [callback]);
      } else {
        this.storedEvents.get(eventName)!.push(callback);
      }
    }),

    emit: fn<IWhatsSocketServiceAdapter["ev"]["emit"]>((eventName, ...args) => {
      const subscribers = this.storedEvents.get(eventName);
      if (subscribers) {
        for (const fn of subscribers) {
          fn(...args);
        }
        return true;
      }
      return false;
    }),
  };

  // WebSocket close mock
  public ws = {
    close: fn(async () => Promise.resolve()),
  };
}
