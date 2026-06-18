import type { Boom } from "@hapi/boom";
import {
  type AnyMessageContent,
  type GroupMetadata,
  type MiscMessageGenerationOptions,
  type WAMessage,
  type WAMessageUpdate,
  type WAPresence,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  jidNormalizedUser,
  makeWASocket,
  useMultiFileAuthState,
} from "baileys";
import pino from "pino";
import { GetPath } from "../../../../libs/BunPath.js";
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
  WhatsSocketConnectionUpdate,
  WhatsSocketLoggerMode,
  WhatsSocketVendorEventMap,
} from "../../types.js";

export type BaileysWASocket = ReturnType<typeof makeWASocket>;

export type BaileysWhatsSocketVendorOptions = {
  /**
   * The log mode of all output exclusive to Baileys.js Adapter only. (Not related to the option 'loggerMode' of the Whatsbotcord/Bot default constructor)
   */
  loggerMode: WhatsSocketLoggerMode;
  credentialsFolder: string;
  ownRawBaileysSocket?: BaileysWASocket;
};

export class BaileysAdapter implements IWhatsappAdapter {
  private readonly _options: BaileysWhatsSocketVendorOptions;

  constructor(options: Omit<BaileysWhatsSocketVendorOptions, "ownRawBaileysSocket">) {
    this._options = options as BaileysWhatsSocketVendorOptions;
  }

  public async Create(): Promise<IWhatsappSocketAdapterClient> {
    if (this._options.ownRawBaileysSocket) {
      return new BaileysWhatsSocketVendorClient(this._options.ownRawBaileysSocket);
    }

    const authInfoPath: string = GetPath(this._options.credentialsFolder);
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: this._options.loggerMode === "recommended" ? "silent" : this._options.loggerMode });
    const socket = makeWASocket({
      version,
      auth: state,
      logger,
    });

    socket.ev.on("creds.update", saveCreds);

    return new BaileysWhatsSocketVendorClient(socket);
  }
}

export class BaileysWhatsSocketVendorClient implements IWhatsappSocketAdapterClient {
  private readonly _socket: BaileysWASocket;

  constructor(socket: BaileysWASocket) {
    this._socket = socket;
  }

  public get ownJID(): string {
    return this._socket.user!.id;
  }

  public normalizeJid(jid: string): string {
    return jidNormalizedUser(jid);
  }

  public getBotJid(): string {
    if (!this._socket.user?.id) {
      throw new Error("Socket user is not ready");
    }

    return this.normalizeJid(this._socket.user.id);
  }

  public on<EventName extends keyof WhatsSocketVendorEventMap>(eventName: EventName, callback: WhatsSocketVendorEventMap[EventName]): void {
    if (eventName === "ConnectionStateChanged") {
      this._socket.ev.on("connection.update", (update) => {
        callback(this._mapConnectionUpdate(update) as never);
      });
      return;
    }

    if (eventName === "IncomingMessagesReceived") {
      this._socket.ev.on("messages.upsert", (messageUpdate) => {
        callback({ ...messageUpdate, messages: messageUpdate.messages as WhatsappMessage[] } as never);
      });
      return;
    }

    if (eventName === "MessagesUpdated") {
      this._socket.ev.on("messages.update", (messagesUpdates: WAMessageUpdate[]) => {
        callback(messagesUpdates as unknown as WhatsappMessage[] as never);
      });
      return;
    }

    if (eventName === "GroupsJoined") {
      this._socket.ev.on("groups.upsert", (groups: GroupMetadata[]) => {
        callback(groups as unknown as WhatsappGroupMetadata[] as never);
      });
      return;
    }

    if (eventName === "GroupsUpdated") {
      this._socket.ev.on("groups.update", (groups) => {
        callback(groups as unknown as Array<Partial<WhatsappGroupMetadata>> as never);
      });
    }
  }

  public async sendMessage(chatId_JID: string, content: WhatsappMessageContent, options?: WhatsappMessageOptions): Promise<WhatsappMessage | null> {
    return ((await this._socket.sendMessage(chatId_JID, content as AnyMessageContent, options as MiscMessageGenerationOptions | undefined)) ??
      null) as WhatsappMessage | null;
  }

  public async fetchGroupMetadata(chatId: string): Promise<WhatsappGroupMetadata> {
    return (await this._socket.groupMetadata(chatId)) as unknown as WhatsappGroupMetadata;
  }

  public async fetchAllGroups(): Promise<WhatsappGroupMetadata[]> {
    return Object.values(await this._socket.groupFetchAllParticipating()) as unknown as WhatsappGroupMetadata[];
  }

  public async updateGroupParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<boolean> {
    const result = await this._socket.groupParticipantsUpdate(groupId, participants, action);
    return !!result;
  }

  public async leaveGroup(groupId: string): Promise<void> {
    await this._socket.groupLeave(groupId);
  }

  public async deleteChatLocally(chatId: string): Promise<void> {
    await this._socket.chatModify(
      {
        delete: true,
        lastMessages: [],
      },
      chatId
    );
  }

  public async downloadMediaMessage(rawMsg: WhatsappMessage): Promise<Buffer> {
    return (await downloadMediaMessage(rawMsg as WAMessage, "buffer", {})) as Buffer;
  }

  public async getPollVotes(pollRawMsg: WhatsappMessage, pollUpdates: WhatsappPollUpdateMessage[]): Promise<WhatsappPollVote[]> {
    return getAggregateVotesInPollMessage(
      {
        message: pollRawMsg.message as WAMessage["message"],
        pollUpdates: pollUpdates as never,
      },
      this.ownJID
    );
  }

  public async shutdown(): Promise<void> {
    await this._socket.ws.close();
  }

  public async setPresenceState(state: WhatsappPresenceState): Promise<boolean> {
    try {
      const presence = this._mapPresenceState(state);
      await this._socket.sendPresenceUpdate(presence);
      return true;
    } catch {
      return false;
    }
  }

  public async setChatActivity(chatId_JID: string, activity: WhatsappChatActivity): Promise<boolean> {
    try {
      const presence = this._mapChatActivity(activity);
      await this._socket.sendPresenceUpdate(presence, chatId_JID);
      return true;
    } catch {
      return false;
    }
  }

  private _mapPresenceState(state: WhatsappPresenceState): WAPresence {
    const states: Record<WhatsappPresenceState, WAPresence> = {
      online: "available",
      offline: "unavailable",
    };

    return states[state];
  }

  private _mapChatActivity(activity: WhatsappChatActivity): WAPresence {
    const activities: Record<WhatsappChatActivity, WAPresence> = {
      typing: "composing",
      recording: "recording",
      idle: "paused",
    };

    return activities[activity];
  }

  private _mapConnectionUpdate(update: { connection?: string; lastDisconnect?: { error?: Error }; qr?: string }): WhatsSocketConnectionUpdate {
    const error = update.lastDisconnect?.error as Boom | undefined;
    const statusCode = error?.output?.statusCode;

    return {
      connection: update.connection,
      qr: update.qr,
      lastDisconnect: update.lastDisconnect
        ? {
            error,
            statusCode,
            isLoggedOut: statusCode === DisconnectReason.loggedOut,
          }
        : undefined,
    };
  }
}
