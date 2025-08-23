import {
  type AnyMessageContent,
  type GroupMetadata,
  type MiscMessageGenerationOptions,
  type WAMessage,
  type WAMessageUpdate,
  type proto,
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  Browsers
} from 'baileys';
import { Boom } from "@hapi/boom";

import pino from "pino";
import moment from "moment";
import encodeQr from "qr";
import Delegate from '../../libs/Delegate';
import { MsgType, SenderType } from '../../Msg.types';
import type { BaileysWASocket, WhatsSocketLoggerMode } from './types';
import { GetPath } from "../../libs/BunPath";
import { MsgHelper_GetMsgTypeFromRawMsg } from '../../helpers/Msg.helper';
import { WhatsAppGroupIdentifier, WhatsappIndividualIdentifier } from '../../Whatsapp.types';
import WhatsSocketSenderQueue from './internals/WhatsSocket.senderqueue';
import type { IWhatsSocket } from './IWhatsSocket';
import { WhatsSocketSugarSender } from './internals/WhatsSocket.sugarsenders';

//TODO: Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)

export type WhatsSocketOptions = {
  /** 
   * Logger mode for the WhatsSocket instance. e.g: 'debug' for max details, 
   * 'silent' to the minimum (nothing)
   * 
   * Default: "silent"
   * */
  loggerMode?: WhatsSocketLoggerMode;

  /** 
   * Folder path relative to root proyect path (or current working directory if 
   * you compile this whole proyect (Likely with bun)) 
   * 
   * Default: "./auth" relative folder
   * */
  credentialsFolder?: string;

  /** 
   * Max number of retries if something goes wrong the socket will try before 
   * shut down completely 
   * Default: 5 retries
   */
  maxReconnectionRetries?: number;

  /** 
   * If true, the socket will ignore messages sent by itself, so they won't 
   * be shown on 'onIncomingMessage' event 
   * Default: true
   * */
  ignoreSelfMessage?: boolean;
  /** 
   * Sets the max of messages can be queued to send to all users (global config). 
   * Used to store a buffer of pending messages to send if for some reason this 
   * bot gets a lot of messages incoming in a short period of time 
   * Default: 20 messages
   */
  senderQueueMaxLimit?: number;

  /** Delay in miliseconds the socket should send all pending msgs (to send ofc) 
   *  Default: 100 miliseconda (fast)
  */
  milisecondsDelayBetweenSentMsgs?: number;
}

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
  public onReconnect: Delegate<() => Promise<void>> = new Delegate();
  public onMessageUpsert: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, msgType: MsgType, senderType: SenderType) => void> = new Delegate();
  public onMessageUpdate: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WAMessage, msgType: MsgType, senderType: SenderType) => void> = new Delegate();
  public onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  public onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  public onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();

  //=== Subcomponents ===
  //They're initialized/instantiated in "Start()"
  private _socket!: BaileysWASocket;
  private _senderQueue!: WhatsSocketSenderQueue;
  public Send!: WhatsSocketSugarSender;

  // === Configuration Private Properties ===
  private _loggerMode: WhatsSocketLoggerMode;
  private _credentialsFolder: string;
  private _ignoreSelfMessages: boolean;
  private _maxReconnectionRetries: number = 5;
  private _actualRetries: number = 0;
  private _senderQueueMaxLimit: number;
  private _milisecondsDelayBetweenSentMsgs: number;
  constructor(options?: WhatsSocketOptions) {
    this._loggerMode = options?.loggerMode ?? "silent";
    this._credentialsFolder = options?.credentialsFolder ?? "./auth";
    this._ignoreSelfMessages = options?.ignoreSelfMessage ?? true;
    this._senderQueueMaxLimit = options?.senderQueueMaxLimit ?? 20;
    this._milisecondsDelayBetweenSentMsgs = options?.milisecondsDelayBetweenSentMsgs ?? 100;
  }
  private _isRestarting: boolean = false;

  /**
   * Initializes the WhatsSocket instance and start connecting to Whatsapp.
   * After this method is called, the socket will be listening for incoming messages and events all the time.
   * Can be canceled and shutdown by calling the `Shutdown` method.
   * @returns A promise that will be running in the background all the time until the socket is closed.
   */
  public async Start() {
    await this.InitializeSelf();
    this.ConfigureReconnection();
    this.ConfigureMessageIncoming();
    this.ConfigureMessagesUpdates();
    this.ConfigureGroupsEnter();
    this.ConfigureGroupsUpdates();

    //Thanks JavaScript ☠️
    this.SendSafe = this.SendSafe.bind(this);
    this.SendRaw = this.SendRaw.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
    this.InitializeSelf = this.InitializeSelf.bind(this);
    this.Shutdown = this.Shutdown.bind(this);
    this.ConfigureReconnection = this.ConfigureReconnection.bind(this);
    this.ConfigureMessageIncoming = this.ConfigureMessageIncoming.bind(this);
    this.ConfigureGroupsEnter = this.ConfigureGroupsEnter.bind(this);
    this.ConfigureGroupsUpdates = this.ConfigureGroupsUpdates.bind(this);
  }


  private async InitializeSelf() {
    const logger = pino({ level: this._loggerMode });
    let authInfoPath: string = GetPath(this._credentialsFolder)
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
    this._socket = makeWASocket({
      auth: state,
      logger: logger,
      browser: Browsers.windows("Desktop"), //Simulates a Windows Desktop client for a better history messages fetching (Thanks to baileys library)
    });
    this._senderQueue = new WhatsSocketSenderQueue(this, this._senderQueueMaxLimit, this._milisecondsDelayBetweenSentMsgs);
    this.Send = new WhatsSocketSugarSender(this);
    this._socket.ev.on("creds.update", saveCreds);
  }

  public async Shutdown() {
    await this._socket.ws.close();
  }

  private ConfigureReconnection(): void {
    this._socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (update.qr) {
        console.log(encodeQr(update.qr, "ascii"));
      }

      if (connection === "open") {
        this._actualRetries = 0; // reset retries on successful connection
        try {
          const groups = Object.values(await this._socket.groupFetchAllParticipating());
          this.onStartupAllGroupsIn.CallAll(groups);
          console.log("INFO: All groups data fetched successfully");
        } catch (err) {
          console.error("ERROR: Couldn't fetch groups", err);
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.warn("Socket closed:", lastDisconnect?.error);

        if (shouldReconnect) {
          this._actualRetries++;
          if (this._actualRetries > this._maxReconnectionRetries) {
            console.error(`ERROR: Max reconnection attempts reached (${this._maxReconnectionRetries}). Giving up.`);
            return;
          }

          if (!this._isRestarting) {
            this._isRestarting = true;
            console.log(`INFO: Restarting socket (attempt ${this._actualRetries}/${this._maxReconnectionRetries})...`);

            try {
              await new Promise((r) => setTimeout(r, 1000));
              await this._socket.ws.close();
              await this.Start();
              console.log("INFO: Socket restarted successfully!");
            } catch (err) {
              console.error("ERROR: Socket restart failed", err);
            } finally {
              this._isRestarting = false;
            }
          }
        }
      }
    });
  }


  private ConfigureMessageIncoming(): void {
    this._socket.ev.on("messages.upsert", async (messageUpdate) => {
      if (!messageUpdate.messages) return;
      for (const msg of messageUpdate.messages) {
        if (this._ignoreSelfMessages)
          if (!msg.message || msg.key.fromMe) continue;

        const chatId = msg.key.remoteJid!;
        const senderId = msg.key.participant ?? null;
        let senderType: SenderType = SenderType.Unknown;
        if (chatId && chatId.endsWith(WhatsAppGroupIdentifier)) senderType = SenderType.Group;
        if (chatId && chatId.endsWith(WhatsappIndividualIdentifier)) senderType = SenderType.Individual;
        this.onMessageUpsert.CallAll(senderId, chatId, msg, MsgHelper_GetMsgTypeFromRawMsg(msg), senderType);
      }
    });
  }

  private ConfigureMessagesUpdates() {
    this._socket.ev.on("messages.update", (msgsUpdates: WAMessageUpdate[]) => {
      if (!msgsUpdates || msgsUpdates.length === 0) return;
      for (const msgUpdate of msgsUpdates) {
        if (this._ignoreSelfMessages)
          if (msgUpdate.key.fromMe) return;

        const chatId: string = msgUpdate.key.remoteJid!;
        const senderId: string | null = msgUpdate.key.participant ?? null;
        let senderType: SenderType = SenderType.Unknown;
        if (chatId && chatId.endsWith(WhatsAppGroupIdentifier)) senderType = SenderType.Group;
        if (chatId && chatId.endsWith(WhatsappIndividualIdentifier)) senderType = SenderType.Individual;
        this.onMessageUpdate.CallAll(senderId, chatId, msgUpdate, MsgHelper_GetMsgTypeFromRawMsg(msgUpdate), senderType);
      }
    })
  }

  /**
   * Gets the metadata of a group chat by its chat ID. (e.g: "23423423123@g.us")
   * @param chatId The chat ID of the group you want to get metadata from.
   * @throws Will throw an error if the provided chatId is not a group chat ID
   * @returns A promise that resolves to the group metadata.
   */
  public async GetGroupMetadata(chatId: string): Promise<GroupMetadata> {
    if (!chatId.endsWith(WhatsAppGroupIdentifier))
      throw new Error("Provided chatId is not a group chat ID. => " + chatId);
    return await this._socket.groupMetadata(chatId);
  }

  private ConfigureGroupsEnter(): void {
    this._socket.ev.on('groups.upsert', async (groupsUpserted: GroupMetadata[]) => {
      for (const group of groupsUpserted) {
        this.onGroupEnter.CallAll(group);
        console.info(`INFO: Joined to a new group ${group.subject} at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
      }
    })
  }

  private ConfigureGroupsUpdates(): void {
    this._socket.ev.on("groups.update", (args) => {
      if (args.length === 0) {
        console.log("INFO: No group updates received.");
        return;
      }
      for (let i = 0; i < args.length; i++) {
        const groupMetadata: Partial<GroupMetadata> | undefined = args[8];
        if (groupMetadata) {
          this.onGroupUpdate.CallAll(groupMetadata);
        }
      }
    })
  }

  public async SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    return this._senderQueue.Enqueue(chatId_JID, content, options);
  }

  public async SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null> {
    //TODO: Do something in case its undefined from this._socket.sendMessage
    const toReturn: proto.WebMessageInfo | null = (await this._socket.sendMessage(chatId_JID, content, options)) ?? null;
    return toReturn;
  }
}
