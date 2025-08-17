import {
  type AnyMessageContent,
  type GroupMetadata,
  type MiscMessageGenerationOptions,
  type WAMessage,
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  Browsers
} from 'baileys';
import { Boom } from "@hapi/boom";

import pino from "pino";
import moment from "moment";
import encodeQr from "qr";
import Delegate from './Delegate';
import { MsgType, SenderType } from './Msg.types';
import type { BaileysWASocket, WhatsSocketLoggerMode } from './WhatsSocket.types';
import { GetPath } from "./BunPath";
import { MsgHelper_GetMsgTypeFromRawMsg } from './Msg.helper';

export type WhatsSocketOptions = {
  /** * Logger mode for the WhatsSocket instance. e.g: 'debug' for max details, 'silent' to the minimum (nothing)  */
  loggerMode?: WhatsSocketLoggerMode;
  /** Folder path relative to root proyect path (or current working directory if you compile this whole proyect (Likely with bun)) */
  credentialsFolder?: string;
  /** Max number of retries if something goes wrong the socket will try before shut down completely */
  maxReconnectionRetries?: number;
  /** * If true, the socket will ignore messages sent by itself, so they won't be shown on 'onIncomingMessage' event */
  ignoreSelfMessage?: boolean;
}

export default class WhatsSocket {
  public onReconnect: Delegate<() => Promise<void>> = new Delegate();
  public onIncomingMessage: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, type: MsgType, senderType: SenderType) => void> = new Delegate();
  public onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void> = new Delegate();
  public onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void> = new Delegate();
  public onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void> = new Delegate();

  private _loggerMode: WhatsSocketLoggerMode;
  private _socket!: BaileysWASocket; //It's initialized in "initializeSelf"
  private _credentialsFolder: string;
  private _ignoreSelfMessages: boolean;
  private _maxReconnectionRetries = 5;
  private _actualRetries = 0;

  constructor(options?: WhatsSocketOptions) {
    this._loggerMode = options?.loggerMode ?? "silent";
    this._credentialsFolder = options?.credentialsFolder ?? "./auth";
    this._ignoreSelfMessages = options?.ignoreSelfMessage ?? true;
  }

  /**
   * Initializes the WhatsSocket instance and start connecting to Whatsapp.
   * After this method is called, the socket will be listening for incoming messages and events all the time.
   * Can be canceled and shutdown by calling the `Shutdown` method.
   * @returns {Promise<void>} A promise that will be running in the background all the time until the socket is closed.
   */
  public async Init() {
    await this.InitializeSelf();
    this.ConfigureReconnection();
    this.ConfigureMessageIncoming();
    this.ConfigureGroupsEnter();
    this.ConfigureGroupsUpdates();

    this.Send = this.Send.bind(this);
    this.GetGroupMetadata = this.GetGroupMetadata.bind(this);
  }

  public async Shutdown() {
    await this._socket.ws.close();
  }

  private async InitializeSelf() {
    const logger = pino({ level: this._loggerMode });
    let authInfoPath: string = GetPath(this._credentialsFolder)
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
    this._socket = makeWASocket({
      auth: state,
      logger: logger,
      browser: Browsers.windows("Desktop") //Simulates a Windows Desktop client
    });
    this._socket.ev.on("creds.update", saveCreds);
  }

  private ConfigureReconnection(): void {
    this._socket.ev.on("connection.update", async (connectionUpdate) => {
      const { connection, lastDisconnect } = connectionUpdate;
      const disconect = lastDisconnect!;

      if (connectionUpdate.qr) {
        const qrCodeAscii = encodeQr(connectionUpdate.qr, "ascii");
        console.log(qrCodeAscii)
      }

      switch (connection) {
        case "close": {
          const shouldReconnect =
            (disconect.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
          if (shouldReconnect) {
            this.onReconnect.CallAll();
            this._actualRetries++;
            if (this._actualRetries > this._maxReconnectionRetries) {
              console.log(`ERROR: Reconnection failed after ${this._maxReconnectionRetries} attempts. Please check your connection or credentials.`);
              return;
            }
          }
          break;
        }
        case "open": {
          // Connection is ready so, try to fetch all groups
          try {
            const groups = Object.values(await this._socket.groupFetchAllParticipating());
            this.onStartupAllGroupsIn.CallAll(groups);
            console.log('INFO: All groups data fetched successfully')
          } catch (error) {
            console.error("ERROR: Couldn't fetch whatsapp groups data...", "Error: " + error)
          }
          break;
        } //Case end
      }//Switch end
    });//Callback end
  }//Function end


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

  private ConfigureMessageIncoming(): void {
    this._socket.ev.on("messages.upsert", async (messageUpdate) => {
      if (!messageUpdate.messages) return;
      for (const msg of messageUpdate.messages) {
        if (this._ignoreSelfMessages)
          if (!msg.message || msg.key.fromMe) continue;

        const chatId = msg.key.remoteJid!;
        const senderId = msg.key.participant ?? null;
        let senderType: SenderType = SenderType.Unknown;
        if (chatId && chatId.endsWith("@g.us")) senderType = SenderType.Group;
        if (chatId && chatId.endsWith("@s.whatsapp.net")) senderType = SenderType.Individual;
        this.onIncomingMessage.CallAll(senderId, chatId, msg, MsgHelper_GetMsgTypeFromRawMsg(msg), senderType);
      }
    });
  }

  public async Send(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions) {
    await this._socket.sendMessage(chatId_JID, content, options);
  }

  public async GetGroupMetadata(chatId: string): Promise<GroupMetadata | null> {
    if (!chatId.endsWith("@g.us")) return null;
    return await this._socket.groupMetadata(chatId);
  }
}

