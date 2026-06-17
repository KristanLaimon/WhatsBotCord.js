import type {
  IWhatsappAdapter,
  IWhatsappSocketAdapterClient,
  WhatsappChatActivity,
  WhatsappGroupMetadata,
  WhatsappGroupParticipantAction,
  WhatsappMessage,
  WhatsappMessageContent,
  WhatsappMessageOptions,
  WhatsappPollUpdateMessage,
  WhatsappPollVote,
  WhatsappPresenceState,
  WhatsSocketVendorEventMap,
} from "./types.js";

/**
 * # Mock Function Interface
 *
 * Represents a mock function that holds call history and can be customized.
 * Compatible with Jest, Vitest, and Bun test assertions.
 */
export interface Mock<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Array<Parameters<T>>;
    results: Array<{ type: "return" | "throw"; value: any }>;
    lastCall: Parameters<T> | undefined;
  };
  mockClear(): void;
  mockReset(): void;
  mockImplementation(fn: T): this;
  mockImplementationOnce(fn: T): this;
  mockReturnValue(val: ReturnType<T>): this;
  mockReturnValueOnce(val: ReturnType<T>): this;
  mockResolvedValue(val: Awaited<ReturnType<T>>): this;
  mockResolvedValueOnce(val: Awaited<ReturnType<T>>): this;
}

/**
 * # Create Mock Function
 *
 * Creates a mock function that tracks invocations, arguments, and returns.
 *
 * @param implementation - Optional initial implementation of the function.
 * @returns A Mock function object.
 *
 * @example
 * ```typescript
 * const myMock = fn((x: number) => x * 2);
 * myMock(3); // 6
 * console.log(myMock.mock.calls); // [[3]]
 * ```
 */
export function fn<T extends (...args: any[]) => any>(implementation?: T): Mock<T> {
  const calls: Array<Parameters<T>> = [];
  const results: Array<{ type: "return" | "throw"; value: any }> = [];
  let currentImpl = implementation;
  const onceQueue: T[] = [];

  const mockFn = (...args: Parameters<T>): ReturnType<T> => {
    calls.push(args);
    const impl = onceQueue.shift() || currentImpl;
    try {
      const value = impl ? impl(...args) : undefined;
      results.push({ type: "return", value });
      return value as ReturnType<T>;
    } catch (error) {
      results.push({ type: "throw", value: error });
      throw error;
    }
  };

  const mockObj = {
    mock: {
      get calls() {
        return calls;
      },
      get results() {
        return results;
      },
      get lastCall() {
        return calls[calls.length - 1];
      },
    },
    mockClear() {
      calls.length = 0;
      results.length = 0;
      onceQueue.length = 0;
    },
    mockReset() {
      calls.length = 0;
      results.length = 0;
      onceQueue.length = 0;
      currentImpl = implementation;
    },
    mockImplementation(newImpl: T) {
      currentImpl = newImpl;
      return mockFn as unknown as Mock<T>;
    },
    mockImplementationOnce(newImpl: T) {
      onceQueue.push(newImpl);
      return mockFn as unknown as Mock<T>;
    },
    mockReturnValue(val: ReturnType<T>) {
      currentImpl = (() => val) as unknown as T;
      return mockFn as unknown as Mock<T>;
    },
    mockReturnValueOnce(val: ReturnType<T>) {
      onceQueue.push((() => val) as unknown as T);
      return mockFn as unknown as Mock<T>;
    },
    mockResolvedValue(val: Awaited<ReturnType<T>>) {
      currentImpl = (() => Promise.resolve(val)) as unknown as T;
      return mockFn as unknown as Mock<T>;
    },
    mockResolvedValueOnce(val: Awaited<ReturnType<T>>) {
      onceQueue.push((() => Promise.resolve(val)) as unknown as T);
      return mockFn as unknown as Mock<T>;
    },
  };

  Object.assign(mockFn, mockObj);

  return mockFn as unknown as Mock<T>;
}

export function CreateWhatsSocketVendorFactoryMock(mockSocket: MockAdapter): IWhatsappAdapter {
  return {
    Create: async () => mockSocket,
  };
}

/**
 * # Mock Adapter
 *
 * A mock implementation of the internal vendor client.
 * The name is kept for compatibility with existing tests.
 */
export class MockAdapter implements IWhatsappSocketAdapterClient {
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
