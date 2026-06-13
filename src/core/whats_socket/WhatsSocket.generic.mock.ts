import { type Mock, mock as fn } from "bun:test";
import type {
  IWhatsappAdapter,
  IWhatsappSocketAdapterClient,
  WhatsappGroupMetadata,
  WhatsappMessage,
  WhatsappMessageContent,
  WhatsappMessageOptions,
  WhatsappGroupParticipantAction,
  WhatsappPollUpdateMessage,
  WhatsappPollVote,
  WhatsSocketVendorEventMap,
  WhatsappPresenceState,
  WhatsappChatActivity,
} from "./types.js";

export function CreateWhatsSocketVendorFactoryMock(mockSocket: GenericSocketVendorClient_Mock): IWhatsappAdapter {
  return {
    Create: async () => mockSocket,
  };
}

/**
 * A mock implementation of the internal vendor client.
 * The name is kept for compatibility with existing tests.
 */
export class GenericSocketVendorClient_Mock implements IWhatsappSocketAdapterClient {
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

  public normalizeJid: Mock<(jid: string) => string> = fn((jid: string) => jid);
  public getBotJid: Mock<() => string> = fn(() => this.normalizeJid(this.ownJID));
  public updateGroupParticipants: Mock<(groupId: string, participants: string[], action: WhatsappGroupParticipantAction) => Promise<boolean>> = fn(
    async (_groupId: string, _participants: string[], _action: WhatsappGroupParticipantAction) => true
  );
  public groupParticipantsUpdate = this.updateGroupParticipants;
  public leaveGroup: Mock<(groupId: string) => Promise<void>> = fn(async (_groupId: string) => Promise.resolve());
  public groupLeave = this.leaveGroup;
  public deleteChatLocally: Mock<(chatId: string) => Promise<void>> = fn(async (_chatId: string) => Promise.resolve());
  public chatModify: Mock<(_mutation: unknown, chatId: string) => Promise<void>> = fn(async (_mutation: unknown, chatId: string) => {
    await this.deleteChatLocally(chatId);
  });

  public downloadMediaMessage: Mock<(rawMsg: WhatsappMessage) => Promise<Buffer>> = fn(async (_rawMsg: WhatsappMessage) => Buffer.from([]));

  public getPollVotes: Mock<(pollRawMsg: WhatsappMessage, pollUpdates: WhatsappPollUpdateMessage[]) => Promise<WhatsappPollVote[]>> = fn(
    async (_pollRawMsg: WhatsappMessage, _pollUpdates: WhatsappPollUpdateMessage[]) => []
  );

  public setPresenceState: Mock<(state: WhatsappPresenceState) => Promise<boolean>> = fn(async (_state: WhatsappPresenceState) => true);

  public setChatActivity: Mock<(chatId_JID: string, activity: WhatsappChatActivity) => Promise<boolean>> = fn(
    async (_chatId_JID: string, _activity: WhatsappChatActivity) => true
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
