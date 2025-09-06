import type { Boom } from "@hapi/boom";
import {
  type AnyMessageContent,
  type GroupMetadata,
  type MiscMessageGenerationOptions,
  type proto,
  type WAMessageUpdate,
  Browsers,
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
} from "baileys";

import moment from "moment";
import pino from "pino";
import encodeQr from "qr";
import { MsgHelper_FullMsg_GetMsgType, MsgHelper_FullMsg_GetSenderType } from "../../helpers/Msg.helper";
import { GetPath } from "../../libs/BunPath";
import Delegate from "../../libs/Delegate";
import type { MsgType } from "../../Msg.types";
import { SenderType } from "../../Msg.types";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../../Whatsapp.types";
import { IWhatsSocket_Submodule_Receiver } from "./internals/WhatsSocket.receiver";
import WhatsSocketSenderQueue_SubModule from "./internals/WhatsSocket.senderqueue";
import { IWhatsSocket_Submodule_SugarSender } from "./internals/WhatsSocket.sugarsenders";
import type { IWhatsSocket } from "./IWhatsSocket";
import type { WhatsappMessage, WhatsSocketLoggerMode } from "./types";
import type { IWhatsSocketServiceAdapter } from "./WhatsSocket.baileys.mock";

//TODO: Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)
export type WhatsSocketOptions = {
  /**
   * Determines the logging level of the WhatsSocket instance.
   * - "debug": full details for troubleshooting.
   * - "silent": minimal output (no logs).
   *
   * @default "debug"
   */
  loggerMode?: WhatsSocketLoggerMode;

  /**
   * Path to the folder where authentication credentials are stored.
   * Can be relative to the project root or the current working directory.
   *
   * @default "./auth"
   */
  credentialsFolder?: string;

  /**
   * Maximum number of reconnection attempts if the socket encounters errors.
   *
   * @default 5
   */
  maxReconnectionRetries?: number;

  /**
   * If true, the socket ignores messages sent by itself, so they won't trigger
   * the 'onIncomingMessage' event.
   *
   * @default true
   */
  ignoreSelfMessage?: boolean;

  /**
   * Maximum number of messages that can be queued for sending globally.
   * Useful for buffering pending messages if the bot receives many messages
   * in a short time.
   *
   * @default 20
   */
  senderQueueMaxLimit?: number;

  /**
   * Delay (in milliseconds) between sending queued messages.
   * Helps prevent spamming or flooding when sending many messages rapidly.
   *
   * @default 100
   */
  delayMilisecondsBetweenMsgs?: number;

  /**
   * Optionally provide a custom implementation of the WhatsApp socket API.
   * By default, Baileys is used.
   *
   * @note Primarily intended for testing. Use at your own risk if you override.
   */
  ownImplementationSocketAPIWhatsapp?: IWhatsSocketServiceAdapter;
};

/**
 * Class used to interact with the WhatsApp Web socket client (baileys).
 * Will start the socket and keep it connected until you call the Shutdown method.
 * Provides some events you can subscribe to, to get notified when different things happen.
 *
 * @example
 * const socket = new WhatsSocket({
 *    credentialsFolder: "./auth",
 *    loggerMode: "silent",
 *    maxReconnectionRetries: 5,
 *    ignoreSelfMessage: true
 * });
 *
 * socket.onIncomingMessage.Subscribe((senderId, chatId, rawMsg, msgType, senderType) => {
 *    console.log(`Msg: ${msgType} | SenderId: ${senderId} | ChatId: ${chatId} | Type: ${msgType} | SenderType: ${senderType}`);
 * });
 *
 * socket.Start().then(() => {
 *    console.log("WhatsSocket initialized successfully!");
 * }).catch((error) => {
 *    console.error("Error initializing WhatsSocket:", error);
 * })
 */
export default class WhatsSocket implements IWhatsSocket {
  //All documentation comes from "IWhatsSocket" interface, check it to see docs about this events
  public onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void> =
    new Delegate();
  public onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void> =
    new Delegate();
  public onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void> = new Delegate();
  public onRestart: Delegate<() => Promise<void>> = new Delegate();
  public onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  public onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  public onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();

  public get ownJID(): string {
    return this._socket.user!.id;
  }

  //=== Subcomponents ===
  //They're initialized/instantiated in "Start()"
  private _socket!: IWhatsSocketServiceAdapter;
  private _senderQueue!: WhatsSocketSenderQueue_SubModule;
  /**
   * Sender module and sugar layer for sending all kinds of msgs.
   * Text, Images, Videos, Polls, etc...
   */
  public Send!: IWhatsSocket_Submodule_SugarSender;

  /**
   * Receive internal module. To wait for someone msg's.
   */
  public Receive!: IWhatsSocket_Submodule_Receiver;

  // === Normal Public Properties ===
  public ActualReconnectionRetries: number = 0;

  // === Configuration Properties ===
  private _loggerMode: WhatsSocketLoggerMode;
  private _credentialsFolder: string;
  private _ignoreSelfMessages: boolean;
  private _maxReconnectionRetries: number;
  private _senderQueueMaxLimit: number;
  private _milisecondsDelayBetweenSentMsgs: number;
  private _customSocketImplementation?: IWhatsSocketServiceAdapter;

  constructor(options?: WhatsSocketOptions) {
    this._loggerMode = options?.loggerMode === "recommended" ? "silent" : options?.loggerMode ?? "silent";
    this._credentialsFolder = options?.credentialsFolder ?? "./auth";
    this._ignoreSelfMessages = options?.ignoreSelfMessage ?? true;
    this._senderQueueMaxLimit = options?.senderQueueMaxLimit ?? 20;
    this._milisecondsDelayBetweenSentMsgs = options?.delayMilisecondsBetweenMsgs ?? 100;
    this._customSocketImplementation = options?.ownImplementationSocketAPIWhatsapp;
    this._maxReconnectionRetries = options?.maxReconnectionRetries ?? 5;
  }
  private _isRestarting: boolean = false;

  /**
   * Initializes the WhatsSocket instance and start connecting to Whatsapp.
   * After this method is called, the socket will be listening for incoming messages and events all the time.
   * Can be canceled and shutdown by calling the `Shutdown` method.
   * @returns A promise that will be running in the background all the time until the socket is closed.
   */
  public async Start(): Promise<void> {
    this.ActualReconnectionRetries = 0;
    await this._initializeSelf();
  }

  /**
   * Restarts the socket by shutting down current one and then starting a new instance, effectively "restarting" the socket.
   * @returns A promise that will be running in the background all the time until the socket is closed.
   */
  public async Restart(): Promise<void> {
    this._isRestarting = true;
    await this.Shutdown();
    await this._initializeSelf();
    this._isRestarting = false;
  }

  private async _initializeSelf(): Promise<void> {
    await this.InitializeInternalSocket();
    this.ConfigureReconnection();
    this.ConfigureMessageIncoming();
    this.ConfigureMessagesUpdates();
    this.ConfigureGroupsEnter();
    this.ConfigureGroupsUpdates();

    //Thanks JavaScript ☠️
    this._SendSafe = this._SendSafe.bind(this);
    this._SendRaw = this._SendRaw.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
    this.InitializeInternalSocket = this.InitializeInternalSocket.bind(this);
    this.Start = this.Start.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this._initializeSelf = this._initializeSelf.bind(this);
    this.ConfigureReconnection = this.ConfigureReconnection.bind(this);
    this.ConfigureMessageIncoming = this.ConfigureMessageIncoming.bind(this);
    this.ConfigureGroupsEnter = this.ConfigureGroupsEnter.bind(this);
    this.ConfigureGroupsUpdates = this.ConfigureGroupsUpdates.bind(this);
  }

  private async InitializeInternalSocket() {
    const authInfoPath: string = GetPath(this._credentialsFolder);
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

    if (this._customSocketImplementation) {
      this._socket = this._customSocketImplementation;
    } else {
      const logger = pino({ level: this._loggerMode });
      //By default uses "Baileys" library whatsapp socket API
      this._socket = makeWASocket({
        auth: state,
        logger: logger,
        browser: Browsers.windows("Desktop"), //Simulates a Windows Desktop client for a better history messages fetching (Thanks to baileys library)
      });
    }
    this._socket.ev.on("creds.update", saveCreds);

    //== Initializing internal sub-modules ==
    this._senderQueue = new WhatsSocketSenderQueue_SubModule(this, this._senderQueueMaxLimit, this._milisecondsDelayBetweenSentMsgs);
    this.Send = new IWhatsSocket_Submodule_SugarSender(this);
    this.Receive = new IWhatsSocket_Submodule_Receiver(this);
  }

  public async Shutdown() {
    await this._socket.ws.close();
  }

  private ConfigureReconnection(): void {
    this._socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Show QR code if needed
      if (qr) {
        console.log(encodeQr(qr, "ascii"));
      }

      // Successfully connected
      if (connection === "open") {
        this.ActualReconnectionRetries = 0; // reset retries
        try {
          const groups = Object.values(await this._socket.groupFetchAllParticipating());
          this.onStartupAllGroupsIn.CallAll(groups);
          if (this._loggerMode !== "silent") {
            console.log("INFO: All groups data fetched successfully");
          }
        } catch (err) {
          if (this._loggerMode !== "silent") {
            console.error("ERROR: Couldn't fetch groups", err);
          }
        }
      }

      // Connection closed
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        // Only attempt to reconnect if not logged out
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (this._loggerMode !== "silent") {
          console.warn("Socket closed", statusCode ? `(code: ${statusCode})` : "");
        }

        if (!shouldReconnect) {
          if (this._loggerMode !== "silent") {
            console.error("ERROR: Socket logged out. Not reconnecting.");
          }
          await this.Shutdown();
          return;
        }

        // Increment retries immediately
        this.ActualReconnectionRetries++;

        // Check max retries
        if (this.ActualReconnectionRetries > this._maxReconnectionRetries) {
          if (this._loggerMode !== "silent") {
            console.error(`ERROR: Max reconnection attempts reached (${this._maxReconnectionRetries}). Giving up.`);
          }
          await this.Shutdown();
          return;
        }

        // Prevent overlapping restarts
        if (this._isRestarting) return;

        this._isRestarting = true;
        if (this._loggerMode !== "silent") {
          console.log(`INFO: Restarting socket (attempt ${this.ActualReconnectionRetries}/${this._maxReconnectionRetries})...`);
        }

        try {
          await this.Restart();
          this.onRestart.CallAll();
          if (this._loggerMode !== "silent") {
            console.log("INFO: Socket restarted successfully!");
          }
        } catch (err) {
          if (this._loggerMode !== "silent") {
            console.error("ERROR: Socket restart failed", err);
          }
        } finally {
          this._isRestarting = false;
        }
      }
    });
  }

  private ConfigureMessageIncoming(): void {
    this._socket.ev.on("messages.upsert", async (messageUpdate) => {
      if (!messageUpdate.messages) return;
      for (const msg of messageUpdate.messages) {
        if (this._ignoreSelfMessages) if (!msg.message || msg.key.fromMe) continue;

        const chatId = msg.key.remoteJid!;
        const senderId = msg.key.participant ?? null;
        let senderType: SenderType = SenderType.Unknown;
        if (chatId && chatId.endsWith(WhatsappGroupIdentifier)) senderType = SenderType.Group;
        if (chatId && chatId.endsWith(WhatsappIndividualIdentifier)) senderType = SenderType.Individual;
        this.onIncomingMsg.CallAll(senderId, chatId, msg, MsgHelper_FullMsg_GetMsgType(msg), senderType);
      }
    });
  }

  private ConfigureMessagesUpdates(): void {
    this._socket.ev.on("messages.update", (msgsUpdates: WAMessageUpdate[]) => {
      if (!msgsUpdates || msgsUpdates.length === 0) return;
      for (const msgUpdate of msgsUpdates) {
        if (this._ignoreSelfMessages) if (msgUpdate.key.fromMe) return;

        const chatId: string = msgUpdate.key.remoteJid!;
        const senderId: string | null = msgUpdate.key.participant ?? null;
        const senderType: SenderType = MsgHelper_FullMsg_GetSenderType(msgUpdate);
        this.onUpdateMsg.CallAll(senderId, chatId, msgUpdate, MsgHelper_FullMsg_GetMsgType(msgUpdate), senderType);
      }
    });
  }

  /**
   * Gets the metadata of a group chat by its chat ID. (e.g: "23423423123@g.us")
   * @param chatId The chat ID of the group you want to get metadata from.
   * @throws Will throw an error if the provided chatId is not a group chat ID
   * @returns A promise that resolves to the group metadata.
   */
  public async GetGroupMetadata(chatId: string): Promise<GroupMetadata> {
    if (!chatId.endsWith(WhatsappGroupIdentifier)) throw new Error("Provided chatId is not a group chat ID. => " + chatId);
    return await this._socket.groupMetadata(chatId);
  }

  private ConfigureGroupsEnter(): void {
    this._socket.ev.on("groups.upsert", async (groupsUpserted: GroupMetadata[]) => {
      for (const group of groupsUpserted) {
        this.onGroupEnter.CallAll(group);
        if (this._loggerMode !== "silent") {
          console.info(`INFO: Joined to a new group ${group.subject} at ${moment().format("YYYY-MM-DD HH:mm:ss")}`);
        }
      }
    });
  }

  private ConfigureGroupsUpdates(): void {
    this._socket.ev.on("groups.update", (args) => {
      if (args.length === 0) {
        if (this._loggerMode !== "silent") {
          console.log("INFO: No group updates received.");
        }
        return;
      }
      for (let i = 0; i < args.length; i++) {
        const groupMetadata: Partial<GroupMetadata> | undefined = args[i];
        if (groupMetadata) {
          this.onGroupUpdate.CallAll(groupMetadata);
        }
      }
    });
  }

  public async _SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WhatsappMessage | null> {
    return this._senderQueue.Enqueue(chatId_JID, content, options);
  }

  public async _SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WhatsappMessage | null> {
    const toReturn: proto.IWebMessageInfo | null = (await this._socket.sendMessage(chatId_JID, content, options)) ?? null;
    return toReturn;
  }
}
