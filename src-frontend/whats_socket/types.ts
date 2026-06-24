/**
 * # Logger Mode
 *
 * Represents the logger mode for WhatsSocket.
 * They are based on the 'pino' library/dependency logger levels. Just extracted them here for convenience.
 *
 * @example
 * ```typescript
 * const mode: WhatsSocketLoggerMode = "silent";
 * ```
 */
export type WhatsSocketLoggerMode = "debug" | "error" | "fatal" | "info" | "silent" | "trace" | "warn" | "recommended";

/**
 * # Custom Logger Mode
 *
 * @example
 * ```typescript
 * const mode: CustomWhatsSocketLoggerMode = "recommended";
 * ```
 */
export type CustomWhatsSocketLoggerMode = "recommended";

/**
 * # WhatsApp Message Key
 *
 * Vendor-neutral identifier block for a WhatsApp message.
 *
 * @example
 * ```typescript
 * const key: WhatsappMessageKey = { remoteJid: "123@g.us", fromMe: false };
 * ```
 */
export type WhatsappMessageKey = {
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  participant?: string | null;
  participantAlt?: string | null;
  fromMe?: boolean | null;
  id?: string | null;
  [key: string]: any;
};

/**
 * # WhatsApp Message Context Info
 *
 * Common metadata attached to a message or message option.
 * Vendors may expose more fields, but these are the fields WhatsBotCord
 * commonly reads or forwards.
 *
 * @example
 * ```typescript
 * const contextInfo: WhatsappMessageContextInfo = { quotedMessage: rawMsg.message };
 * ```
 */
export type WhatsappMessageContextInfo = {
  quotedMessage?: WhatsappProtocolMessage | null;
  stanzaId?: string | null;
  participant?: string | null;
  mentionedJid?: string[] | null;
  expiration?: number | null;
  ephemeralSettingTimestamp?: number | string | null;
  disappearingMode?: {
    initiator?: string | number | null;
    [key: string]: any;
  } | null;
  forwardingScore?: number | null;
  isForwarded?: boolean | null;
  [key: string]: any;
};

/**
 * # WhatsApp Protocol Message
 *
 * Minimal message payload shape used by WhatsBotCord internals.
 * Vendor adapters may attach extra fields, but application code should only
 * depend on the fields declared here.
 *
 * @example
 * ```typescript
 * const msg: WhatsappProtocolMessage = { conversation: "hello" };
 * ```
 */
export type WhatsappProtocolMessage = {
  conversation?: string | null;
  extendedTextMessage?: {
    text?: string | null;
    contextInfo?: WhatsappMessageContextInfo | null;
    [key: string]: any;
  } | null;
  imageMessage?: { caption?: string | null; url?: string | null; mimetype?: string | null; [key: string]: any } | null;
  videoMessage?: { caption?: string | null; url?: string | null; mimetype?: string | null; [key: string]: any } | null;
  audioMessage?: { url?: string | null; mimetype?: string | null; [key: string]: any } | null;
  stickerMessage?: { url?: string | null; mimetype?: string | null; [key: string]: any } | null;
  pollCreationMessage?: Record<string, any> | null;
  pollCreationMessageV3?: {
    name?: string | null;
    selectableOptionsCount?: number | null;
    options?: Array<{ optionName?: string | null; [key: string]: any }> | null;
    [key: string]: any;
  } | null;
  pollUpdateMessage?: WhatsappPollUpdateMessage | null;
  locationMessage?: {
    degreesLatitude?: number | null;
    degreesLongitude?: number | null;
    jpegThumbnail?: Uint8Array | null;
    isLive?: boolean | null;
    name?: string | null;
    address?: string | null;
    [key: string]: any;
  } | null;
  contactMessage?: {
    displayName?: string | null;
    vcard?: string | null;
    [key: string]: any;
  } | null;
  contactsArrayMessage?: {
    contacts?: Array<{
      displayName?: string | null;
      vcard?: string | null;
      [key: string]: any;
    }> | null;
    [key: string]: any;
  } | null;
  documentMessage?: { url?: string | null; fileName?: string | null; mimetype?: string | null; [key: string]: any } | null;
  [key: string]: any;
};

/**
 * # WhatsApp Message
 *
 * Vendor-neutral raw message shape used across WhatsBotCord.
 *
 * @example
 * ```typescript
 * const msg: WhatsappMessage = { key: { remoteJid: "123@s.whatsapp.net" }, message: { conversation: "hello" } };
 * ```
 */
export type WhatsappMessage = {
  key: WhatsappMessageKey;
  message?: WhatsappProtocolMessage | null;
  pushName?: string | null;
  [key: string]: any;
};

/**
 * # WhatsApp Message Content
 *
 * Vendor-neutral outgoing message content. The shape intentionally keeps an
 * index signature because WhatsApp vendors expose different optional features.
 *
 * @example
 * ```typescript
 * const content: WhatsappMessageContent = { text: "hello" };
 * ```
 */
export type WhatsappMessageContent = {
  text?: string;
  mentions?: string[];
  image?: Uint8Array | { url: string };
  video?: Uint8Array | { url: string };
  audio?: Uint8Array | { url: string };
  sticker?: Uint8Array | { url: string };
  document?: Uint8Array | { url: string };
  mimetype?: string;
  caption?: string;
  fileName?: string;
  react?: {
    text: string;
    key: WhatsappMessageKey;
  };
  poll?: {
    name: string;
    values: string[];
    selectableCount: number;
  };
  location?: {
    degreesLatitude: number;
    degreesLongitude: number;
    name?: string;
    address?: string;
  };
  contacts?: {
    displayName: string;
    contacts: Array<{ vcard: string }>;
  };
  [key: string]: any;
};

/**
 * # WhatsApp Message Options
 *
 * Vendor-neutral message sending options.
 *
 * @example
 * ```typescript
 * const options: WhatsappMessageOptions = { quoted: rawMsg };
 * ```
 */
export type WhatsappMessageOptions = {
  /**
   * Message that the new outgoing message should reply to.
   * Each vendor adapter maps this to the vendor-specific quoted-message option.
   */
  quoted?: WhatsappMessage;

  /**
   * Optional context metadata to attach to the outgoing message.
   */
  contextInfo?: WhatsappMessageContextInfo;

  /**
   * Whether the outgoing message is a broadcast/status message.
   */
  broadcast?: boolean;

  /**
   * Contacts allowed to receive a status broadcast.
   */
  statusJidList?: string[];

  /**
   * Ephemeral duration in seconds when the vendor supports disappearing messages.
   */
  ephemeralExpiration?: number;

  [key: string]: any;
};

/**
 * # WhatsApp Group Participant
 *
 * Minimal participant metadata shape used by WhatsBotCord.
 *
 * @example
 * ```typescript
 * const participant: WhatsappGroupParticipant = { id: "123@s.whatsapp.net", admin: "admin" };
 * ```
 */
export type WhatsappGroupParticipant = {
  id?: string | null;
  lid?: string | null;
  admin?: "admin" | "superadmin" | null;
  [key: string]: any;
};

/**
 * # WhatsApp Group Metadata
 *
 * Vendor-neutral group metadata used by WhatsBotCord.
 *
 * @example
 * ```typescript
 * const group: WhatsappGroupMetadata = { id: "123@g.us", subject: "Group", participants: [] };
 * ```
 */
export type WhatsappGroupMetadata = {
  id: string;
  subject: string;
  participants: WhatsappGroupParticipant[];
  addressingMode?: "pn" | "lid" | string | null;
  subjectOwner?: string | null;
  owner?: string | null;
  desc?: string | null;
  inviteCode?: string | null;
  isCommunity?: boolean | null;
  restrict?: boolean | null;
  announce?: boolean | null;
  memberAddMode?: boolean | null;
  joinApprovalMode?: boolean | null;
  isCommunityAnnounce?: boolean | null;
  ephemeralDuration?: number | null;
  subjectTime?: number | null;
  creation?: number | null;
  [key: string]: any;
};

/**
 * # WhatsApp Group Participant Action
 *
 * Vendor-neutral participant update action supported by WhatsApp groups.
 *
 * @example
 * ```typescript
 * const action: WhatsappGroupParticipantAction = "promote";
 * ```
 */
export type WhatsappGroupParticipantAction = "add" | "remove" | "promote" | "demote";

export type WhatsappPresenceState = "online" | "offline";
export type WhatsappChatActivity = "typing" | "recording" | "idle";

export type WhatsappMessageUpdate = WhatsappMessage;

export type WhatsappPollUpdateMessage = {
  pollCreationMessageKey?: WhatsappMessageKey | null;
  [key: string]: any;
};

export type WhatsappPollVote = {
  name: string;
  voters: string[];
};

export type WhatsSocketConnectionUpdate = {
  connection?: "open" | "close" | string;
  qr?: string;
  lastDisconnect?: {
    error?: unknown;
    statusCode?: number;
    isLoggedOut?: boolean;
  };
};

export type WhatsSocketIncomingMessagesUpdate = {
  messages?: WhatsappMessage[];
  [key: string]: any;
};

export type WhatsSocketGroupParticipantsUpdate = {
  id: string;
  participants: string[];
  action: WhatsappGroupParticipantAction;
};

export type WhatsSocketVendorEventMap = {
  ConnectionStateChanged: (update: WhatsSocketConnectionUpdate) => void | Promise<void>;
  IncomingMessagesReceived: (messageUpdate: WhatsSocketIncomingMessagesUpdate) => void | Promise<void>;
  MessagesUpdated: (messagesUpdates: WhatsappMessageUpdate[]) => void | Promise<void>;
  GroupsJoined: (groups: WhatsappGroupMetadata[]) => void | Promise<void>;
  GroupsUpdated: (groups: Array<Partial<WhatsappGroupMetadata>>) => void | Promise<void>;
  GroupParticipantsUpdated: (update: WhatsSocketGroupParticipantsUpdate) => void | Promise<void>;
};

/**
 * # WhatsApp Vendor Client
 *
 * Low-level internal contract implemented by WhatsApp vendor adapters.
 * The rest of the application talks to this interface, never to Baileys
 * or another vendor directly.
 *
 * @example
 * ```typescript
 * const client: IWhatsSocketVendorClient = await factory.Create();
 * client.on("IncomingMessagesReceived", update => console.log(update.messages));
 * ```
 */
export interface IWhatsappSocketAdapterClient {
  readonly ownJID: string;

  on<EventName extends keyof WhatsSocketVendorEventMap>(eventName: EventName, callback: WhatsSocketVendorEventMap[EventName]): void;

  normalizeJid(jid: string): string;

  getBotJid(): string;

  sendMessage(chatId_JID: string, content: WhatsappMessageContent, options?: WhatsappMessageOptions): Promise<WhatsappMessage | null>;

  fetchGroupMetadata(chatId: string): Promise<WhatsappGroupMetadata>;

  fetchAllGroups(): Promise<WhatsappGroupMetadata[]>;

  createGroup(subject: string, participants: string[]): Promise<WhatsappGroupMetadata>;

  updateGroupParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<boolean>;

  leaveGroup(groupId: string): Promise<void>;

  deleteChatLocally(chatId: string): Promise<void>;

  downloadMediaMessage(rawMsg: WhatsappMessage): Promise<Uint8Array>;

  getPollVotes(pollRawMsg: WhatsappMessage, pollUpdates: WhatsappPollUpdateMessage[]): Promise<WhatsappPollVote[]>;

  setPresenceState(state: WhatsappPresenceState): Promise<boolean>;

  setChatActivity(chatId_JID: string, activity: WhatsappChatActivity): Promise<boolean>;

  shutdown(): Promise<void>;
}

export interface IWhatsappAdapter {
  Create(): Promise<IWhatsappSocketAdapterClient>;
}

