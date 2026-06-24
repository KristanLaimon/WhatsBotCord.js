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
  WhatsSocketGroupParticipantsUpdate,
  WhatsSocketIncomingMessagesUpdate,
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
        const mappedUpdate = this._mapConnectionUpdate(update) satisfies WhatsSocketConnectionUpdate;
        (callback as WhatsSocketVendorEventMap["ConnectionStateChanged"])(mappedUpdate);
      });
      return;
    }

    if (eventName === "IncomingMessagesReceived") {
      this._socket.ev.on("messages.upsert", (messageUpdate) => {
        const mapped = {
          ...messageUpdate,
          messages: messageUpdate.messages as WhatsappMessage[],
        } satisfies WhatsSocketIncomingMessagesUpdate;
        (callback as WhatsSocketVendorEventMap["IncomingMessagesReceived"])(mapped);
      });
      return;
    }

    if (eventName === "MessagesUpdated") {
      this._socket.ev.on("messages.update", (messagesUpdates: WAMessageUpdate[]) => {
        const mapped = messagesUpdates.map((update) => update as unknown as WhatsappMessage) satisfies WhatsappMessage[];
        (callback as WhatsSocketVendorEventMap["MessagesUpdated"])(mapped);
      });
      return;
    }

    if (eventName === "GroupsJoined") {
      this._socket.ev.on("groups.upsert", (groups: GroupMetadata[]) => {
        const mapped = groups.map((g) => {
          return {
            id: g.id,
            subject: g.subject,
            participants: g.participants.map((p) => ({
              id: p.id,
              lid: p.lid,
              admin: p.admin,
            })),
            addressingMode: g.addressingMode,
            subjectOwner: g.subjectOwner,
            owner: g.owner,
            desc: g.desc,
            inviteCode: g.inviteCode,
            isCommunity: g.isCommunity,
            restrict: g.restrict,
            announce: g.announce,
            memberAddMode: g.memberAddMode,
            joinApprovalMode: g.joinApprovalMode,
            isCommunityAnnounce: g.isCommunityAnnounce,
            ephemeralDuration: g.ephemeralDuration,
            subjectTime: g.subjectTime,
            creation: g.creation,
          } satisfies WhatsappGroupMetadata;
        });
        (callback as WhatsSocketVendorEventMap["GroupsJoined"])(mapped);
      });
      return;
    }

    if (eventName === "GroupsUpdated") {
      this._socket.ev.on("groups.update", (groups) => {
        const mapped = groups.map((g) => {
          const update: Partial<WhatsappGroupMetadata> = {};
          if (typeof g.id !== "undefined") update.id = g.id;
          if (typeof g.subject !== "undefined") update.subject = g.subject;
          if (typeof g.participants !== "undefined") {
            update.participants = g.participants.map((p) => ({
              id: p.id,
              lid: p.lid,
              admin: p.admin,
            }));
          }
          if (typeof g.addressingMode !== "undefined") update.addressingMode = g.addressingMode;
          if (typeof g.subjectOwner !== "undefined") update.subjectOwner = g.subjectOwner;
          if (typeof g.owner !== "undefined") update.owner = g.owner;
          if (typeof g.desc !== "undefined") update.desc = g.desc;
          if (typeof g.inviteCode !== "undefined") update.inviteCode = g.inviteCode;
          if (typeof g.isCommunity !== "undefined") update.isCommunity = g.isCommunity;
          if (typeof g.restrict !== "undefined") update.restrict = g.restrict;
          if (typeof g.announce !== "undefined") update.announce = g.announce;
          if (typeof g.memberAddMode !== "undefined") update.memberAddMode = g.memberAddMode;
          if (typeof g.joinApprovalMode !== "undefined") update.joinApprovalMode = g.joinApprovalMode;
          if (typeof g.isCommunityAnnounce !== "undefined") update.isCommunityAnnounce = g.isCommunityAnnounce;
          if (typeof g.ephemeralDuration !== "undefined") update.ephemeralDuration = g.ephemeralDuration;
          if (typeof g.subjectTime !== "undefined") update.subjectTime = g.subjectTime;
          if (typeof g.creation !== "undefined") update.creation = g.creation;
          return update;
        }) satisfies Array<Partial<WhatsappGroupMetadata>>;
        (callback as WhatsSocketVendorEventMap["GroupsUpdated"])(mapped);
      });
      return;
    }

    if (eventName === "GroupParticipantsUpdated") {
      this._socket.ev.on("group-participants.update", (update) => {
        const mapped = {
          id: update.id,
          participants: update.participants.map((p: any) => (typeof p === "string" ? p : p.id)),
          action: update.action as WhatsappGroupParticipantAction,
        } satisfies WhatsSocketGroupParticipantsUpdate;
        (callback as WhatsSocketVendorEventMap["GroupParticipantsUpdated"])(mapped);
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

  public async createGroup(subject: string, participants: string[]): Promise<WhatsappGroupMetadata> {
    return (await this._socket.groupCreate(subject, participants)) as unknown as WhatsappGroupMetadata;
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
