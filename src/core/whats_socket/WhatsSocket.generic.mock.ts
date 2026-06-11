import { type Mock, mock as fn } from "bun:test";
import type {
  IWhatsSocketVendorClient,
  WhatsappGroupMetadata,
  WhatsappMessage,
  WhatsappMessageContent,
  WhatsappMessageOptions,
  WhatsappPollUpdateMessage,
  WhatsappPollVote,
  WhatsSocketVendorEventMap,
} from "./types.js";

/**
 * A mock implementation of the internal vendor client.
 * The name is kept for compatibility with existing tests.
 */
export class GenericSocketVendorClient_Mock implements IWhatsSocketVendorClient {
  public readonly ownJID = "mock-jid";
  public user = { id: this.ownJID };

  // Storage for event subscribers
  private storedEvents: Map<string, Array<(...args: any[]) => void>> = new Map();

  public sendMessage: Mock<(jid: string, content: WhatsappMessageContent, options?: WhatsappMessageOptions) => Promise<WhatsappMessage>> = fn(
    async (jid: string, content: WhatsappMessageContent, _options?: WhatsappMessageOptions) => {
      return {
        key: { remoteJid: jid, fromMe: false },
        message: content,
      };
    }
  );

  public fetchGroupMetadata: Mock<(chatId: string) => Promise<WhatsappGroupMetadata>> = fn(async (chatId: string) => ({
    id: chatId,
    subject: "Mock Group",
    creation: Date.now(),
    creator: "mock-user",
    participants: [],
  }));

  public fetchAllGroups: Mock<() => Promise<WhatsappGroupMetadata[]>> = fn(async () => []);
  public groupMetadata = this.fetchGroupMetadata;
  public groupFetchAllParticipating: Mock<() => Promise<Record<string, WhatsappGroupMetadata>>> = fn(async () => {
    const groups = await this.fetchAllGroups();
    return Object.fromEntries(groups.map((group) => [group.id, group]));
  });

  public downloadMediaMessage: Mock<(rawMsg: WhatsappMessage) => Promise<Buffer>> = fn(async (_rawMsg: WhatsappMessage) => Buffer.from([]));

  public getPollVotes: Mock<(pollRawMsg: WhatsappMessage, pollUpdates: WhatsappPollUpdateMessage[]) => Promise<WhatsappPollVote[]>> = fn(
    async (_pollRawMsg: WhatsappMessage, _pollUpdates: WhatsappPollUpdateMessage[]) => []
  );

  public shutdown: Mock<() => Promise<void>> = fn(async () => Promise.resolve());
  public ws = {
    close: this.shutdown,
  };

  public on<EventName extends keyof WhatsSocketVendorEventMap>(eventName: EventName, callback: WhatsSocketVendorEventMap[EventName]): void {
    this.ev.on(eventName, callback);
  }

  // Event system kept for older tests that emit directly.
  public ev = {
    on: fn((eventName: string, callback: (...args: any[]) => void) => {
      if (!this.storedEvents.has(eventName)) {
        this.storedEvents.set(eventName, [callback]);
      } else {
        this.storedEvents.get(eventName)!.push(callback);
      }
    }),

    emit: fn((eventName: string, ...args: any[]) => {
      const subscribers = this.storedEvents.get(eventName);
      if (subscribers) {
        for (const callback of subscribers) {
          callback(...args);
        }
        return true;
      }
      return false;
    }),
  };
}
