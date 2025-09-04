import type { WAMessage, proto } from "baileys";
import { MsgHelper_GetMsgTypeFromProtoIMessage, MsgHelper_GetQuotedMsgFrom, MsgHelper_GetTextFrom } from "../../helpers/Msg.helper";
import { MsgType, type SenderType } from "../../Msg.types";
import type { WhatsSocketReceiver_SubModule } from "../whats_socket/internals/WhatsSocket.receiver";
import type { WhatsSocketSugarSender_Submodule } from "../whats_socket/internals/WhatsSocket.sugarsenders";
import type { IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "../whats_socket/IWhatsSocket";
import WhatsSocket, { type WhatsSocketOptions } from "../whats_socket/WhatsSocket";
import { ChatContext } from "./internals/ChatSession";
import CommandsSearcher, { CommandType } from "./internals/CommandsSearcher";
import type { FoundQuotedMsg } from "./internals/CommandsSearcher.types";
import type { IBotCommand } from "./internals/IBotCommand";

export type WhatsBotOptions = Omit<WhatsSocketOptions, "ownImplementationSocketAPIWhatsapp"> & {
  /**
   * @default '@'
   */
  tagCharPrefix?: string | string[];
  /**
   * @default '!'
   */
  commandPrefix?: string | string[];
};
export type WhatsBotEvents = IWhatsSocket_EventsOnly_Module;
export type WhatsBotSender = WhatsSocketSugarSender_Submodule;
export type WhatsBotReceiver = WhatsSocketReceiver_SubModule;
export type WhatsBotCommands = CommandsSearcher;

/**
 * Represents the main WhatsApp Bot instance.
 *
 * The `Bot` class orchestrates the WhatsApp socket connection and provides a
 * command-driven interaction system (similar to Discord bots).
 *
 * Typical usage involves registering and handling commands via the internal
 * `Command` prop.
 *
 * Example:
 * ```ts
 * const bot = new Bot();
 * await bot.Start();
 *
 * // Commands are usually registered in the command system
 * bot.Commands.Register("ping", async (ctx) => ctx.Reply("pong"));
 * ```
 */
export default class Bot {
  private _socket: IWhatsSocket;
  private _commandSearcher: CommandsSearcher;
  private _options: WhatsBotOptions;

  /**
   * Direct access to the underlying send messaging module.
   *
   * ⚠️ Normally you should not use this directly.
   * Use the bot’s command system to send replies and interact with users.
   *
   * This exists for advanced cases where you need to bypass the command
   * framework (e.g., sending raw messages to specific chats).
   */
  public get SendMsg(): WhatsBotSender {
    return this._socket.Send;
  }

  /**
   * Direct access to the underlying receive messaging module.
   *
   * ⚠️ Normally you should not use this directly.
   * The bot’s command system will handle incoming messages for you.
   *
   * This exists for advanced use cases like:
   * - Listening to non-command events (group joins, reactions, etc.).
   * - Building custom listeners outside of the command framework.
   */
  public get ReceiveMsg(): WhatsBotReceiver {
    return this._socket.Receive;
  }

  public get Events(): WhatsBotEvents {
    return {
      onGroupEnter: this._socket.onGroupEnter,
      onGroupUpdate: this._socket.onGroupUpdate,
      onIncomingMsg: this._socket.onIncomingMsg,
      onRestart: this._socket.onRestart,
      onSentMessage: this._socket.onSentMessage,
      onStartupAllGroupsIn: this._socket.onStartupAllGroupsIn,
      onUpdateMsg: this._socket.onUpdateMsg,
    };
  }

  public get Commands(): WhatsBotCommands {
    return this._commandSearcher;
  }

  /**
   * Creates a new instance of the `Bot`.
   *
   * @param options - Optional configuration for customizing bot behavior.
   *
   * Default values:
   * - `credentialsFolder`: `"./auth"`
   * - `delayMilisecondsBetweenMsgs`: `100`
   * - `ignoreSelfMessage`: `true`
   * - `loggerMode`: `"debug"`
   * - `maxReconnectionRetries`: `5`
   * - `senderQueueMaxLimit`: `20`
   */
  constructor(options?: WhatsBotOptions) {
    this._options = {
      credentialsFolder: options?.credentialsFolder ?? "./auth",
      delayMilisecondsBetweenMsgs: options?.delayMilisecondsBetweenMsgs ?? 100,
      ignoreSelfMessage: options?.ignoreSelfMessage ?? true,
      loggerMode: options?.loggerMode ?? "debug",
      maxReconnectionRetries: options?.maxReconnectionRetries ?? 5,
      senderQueueMaxLimit: options?.senderQueueMaxLimit ?? 20,
      commandPrefix: typeof options?.commandPrefix === "string" ? [options.commandPrefix] : options?.commandPrefix ?? ["!"],
      tagCharPrefix: typeof options?.tagCharPrefix === "string" ? [options.tagCharPrefix] : options?.commandPrefix ?? ["@"],
    };

    this.Start = this.Start.bind(this);

    this._commandSearcher = new CommandsSearcher();
    this._socket = new WhatsSocket(this._options);

    this.EVENT_OnMessageIncoming = this.EVENT_OnMessageIncoming.bind(this);
    this._socket.onIncomingMsg.Subscribe(this.EVENT_OnMessageIncoming);
  }

  /**
   * Starts the bot by initializing the WhatsApp socket connection.
   *
   * This method must be called before the bot can process commands.
   *
   * Example:
   * ```ts
   * const bot = new Bot();
   * await bot.Start();
   * ```
   */
  public async Start(): Promise<void> {
    return this._socket.Start();
  }

  private async EVENT_OnMessageIncoming(senderId: string | null, chatId: string, rawMsg: WAMessage, msgType: MsgType, senderType: SenderType): Promise<void> {
    //Middlewares here

    if (msgType === MsgType.Text) {
      const txtFromMsg: string | null = MsgHelper_GetTextFrom(rawMsg);
      if (!txtFromMsg || txtFromMsg.length === 0) return;
      const txtFromMsgHealthy: string = txtFromMsg.trim();

      // === Check if command, then what type ===
      const prefix: string = txtFromMsgHealthy[0]!;
      let commandType: CommandType;
      if ((this._options.commandPrefix as string[]).includes(prefix)) {
        commandType = CommandType.Normal;
      } else if ((this._options.tagCharPrefix as string[]).includes(prefix)) {
        commandType = CommandType.Tag;
      } else {
        return;
      }
      //TODO: Finish this stuff

      const rawArgs: string[] = txtFromMsg.slice(1).split(" ");
      //If user only sent "!" instead of !command (if '!' is prefix ofc)
      if (rawArgs.length === 0) {
        return;
      }
      const commandOrAliasNameLowerCased: string = rawArgs.at(0)!.toLowerCase();
      const commandArgs: string[] = rawArgs.length > 1 ? rawArgs.slice(1) : [];

      let commandFound: IBotCommand | null = null;
      //1. Check if is normal command (not alias)
      if (commandType === CommandType.Normal) {
        commandFound = this.Commands.GetCommand(commandOrAliasNameLowerCased);
      }
      //2. Check if is tag (not alias)
      if (commandType === CommandType.Tag) {
        commandFound = this.Commands.GetTag(commandOrAliasNameLowerCased);
      }
      //3. Check if is command by alias
      if (!commandFound) {
        const possibleFound = this.Commands.GetWhateverWithAlias(commandOrAliasNameLowerCased);
        commandFound = possibleFound?.command ?? null;
      }

      //Couldn't found any commands or tag with that name or alias
      if (!commandFound) {
        return;
      }

      const existsQuotedMsg: proto.IMessage | null = MsgHelper_GetQuotedMsgFrom(rawMsg);
      let quotedMsgAsArgument: FoundQuotedMsg | null = null;
      if (existsQuotedMsg) {
        const quotedMsgType: MsgType = MsgHelper_GetMsgTypeFromProtoIMessage(existsQuotedMsg);
        quotedMsgAsArgument = {
          userIdItComesFrom: rawMsg.message?.extendedTextMessage?.contextInfo?.participant ?? senderId! ?? "ID_NOT_IDENTIFIED",
          msg: existsQuotedMsg,
          type: quotedMsgType,
        };
      }

      try {
        await commandFound.run(
          /** Chat Context */
          new ChatContext(chatId, rawMsg, this._socket.Send),
          /** RawAPI */
          {
            Receive: this._socket.Receive,
            Send: this._socket.Send,
          },
          /** Command basic arguments */
          {
            args: commandArgs,
            chatId: chatId,
            msgType: msgType,
            originalRawMsg: rawMsg,
            senderType: senderType,
            userId: senderId,
            quotedMsg: quotedMsgAsArgument,
          }
        );
      } catch (e) {
        console.log(`[FATAL ERROR]: Error when trying to execute '${commandOrAliasNameLowerCased}'\n\n`, `Error Info: ${JSON.stringify(e, null, 2)}`);
      }
    }
  }
}

//TODO: Add a simple middleware system when OnMessageIncoming
