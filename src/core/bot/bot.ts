import type { WAMessage, proto } from "baileys";
import { MsgHelper_GetMsgTypeFromProtoIMessage, MsgHelper_GetQuotedMsgFrom, MsgHelper_GetTextFrom } from "../../helpers/Msg.helper";
import Delegate from "../../libs/Delegate";
import { MsgType, type SenderType } from "../../Msg.types";
import {
  WhatsSocketReceiverHelper_isReceiverError,
  WhatsSocketReceiverMsgError,
  type WhatsSocket_Submodule_Receiver,
} from "../whats_socket/internals/WhatsSocket.receiver";
import type { WhatsSocket_Submodule_SugarSender } from "../whats_socket/internals/WhatsSocket.sugarsenders";
import type { IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "../whats_socket/IWhatsSocket";
import WhatsSocket, { type WhatsSocketOptions } from "../whats_socket/WhatsSocket";
import { ChatContext, type ChatContextConfig } from "./internals/ChatContext";
import CommandsSearcher, { CommandType } from "./internals/CommandsSearcher";
import type { FoundQuotedMsg } from "./internals/CommandsSearcher.types";
import type { IBotCommand } from "./internals/IBotCommand";

export type WhatsBotOptions = Omit<WhatsSocketOptions, "ownImplementationSocketAPIWhatsapp"> &
  Omit<Partial<ChatContextConfig>, "ignoreSelfMessages"> & {
    /**
     * @default '@'
     */
    tagCharPrefix?: string | string[];
    /**
     * @default '!'
     */
    commandPrefix?: string | string[];
  };

export type WhatsBotEvents = IWhatsSocket_EventsOnly_Module & {
  onCommandNotFound: Delegate<(commandNameThatCouldntBeFound: string) => void | Promise<void>>;
};
export type WhatsBotSender = WhatsSocket_Submodule_SugarSender;
export type WhatsBotReceiver = WhatsSocket_Submodule_Receiver;
export type WhatsBotCommands = CommandsSearcher;

export type BotMiddleWareFunct = (
  senderId: string | null,
  chatId: string,
  rawMsg: WAMessage,
  msgType: MsgType,
  senderType: SenderType,
  next: () => void
) => void;

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

  private _internalMiddleware: BotMiddleWareFunct[] = [];

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
      onCommandNotFound: new Delegate<(commandNameThatCouldntBeFound: string) => void>(),
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
      loggerMode: options?.loggerMode ?? "recommended",
      maxReconnectionRetries: options?.maxReconnectionRetries ?? 5,
      senderQueueMaxLimit: options?.senderQueueMaxLimit ?? 20,
      commandPrefix: typeof options?.commandPrefix === "string" ? [options.commandPrefix] : options?.commandPrefix ?? ["!"],
      tagCharPrefix: typeof options?.tagCharPrefix === "string" ? [options.tagCharPrefix] : options?.tagCharPrefix ?? ["@"],
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
    // ======== Middleware chain section ========
    let continueWithEvent: boolean = false;
    const callMiddleware = async (index: number): Promise<void> => {
      if (index >= this._internalMiddleware.length) {
        continueWithEvent = true;
        return; // end of chain
      }
      const middleware = this._internalMiddleware[index]!;
      await middleware(senderId, chatId, rawMsg, msgType, senderType, (): Promise<void> => callMiddleware(index + 1));
    };
    await callMiddleware(0);
    if (!continueWithEvent) return;

    // ==== Main Logic =====
    if (msgType === MsgType.Text) {
      const txtFromMsg: string | null = MsgHelper_GetTextFrom(rawMsg);
      if (!txtFromMsg || txtFromMsg.length === 0) return;
      const txtFromMsgHealthy: string = txtFromMsg.trim();

      const rawArgs: string[] = txtFromMsg.slice(1).split(" ");
      //If user only sent "!" instead of !command (if '!' is prefix for example)
      if (rawArgs.length === 0) {
        return;
      }

      const commandOrAliasNameLowerCased: string = rawArgs.at(0)!.toLowerCase();
      const commandArgs: string[] = rawArgs.length > 1 ? rawArgs.slice(1) : [];

      // === Check if command, then what type ===
      const prefix: string = txtFromMsgHealthy[0]!;
      let commandFound: IBotCommand | null = null;
      let commandTypeFound: CommandType | null = null;
      // 1. Check if its normal command
      if ((this._options.commandPrefix as string[]).includes(prefix)) {
        commandTypeFound = CommandType.Normal;
        commandFound = this.Commands.GetCommand(commandOrAliasNameLowerCased);
        // 2. Check if is tag command
      } else if ((this._options.tagCharPrefix as string[]).includes(prefix)) {
        commandTypeFound = CommandType.Tag;
        commandFound = this.Commands.GetTag(commandOrAliasNameLowerCased);
      }
      // 3. Found type of command but not with normal name? Try searching if its an alias
      if (!commandFound && commandTypeFound) {
        commandFound = this.Commands.GetWhateverWithAlias(commandOrAliasNameLowerCased, commandTypeFound);
      }
      // 4. Can't be found after all that? its not a valid command
      if (!commandFound) return;

      //Couldn't found any commands or tag with that name or alias
      if (!commandFound) {
        this.Events.onCommandNotFound.CallAll(commandOrAliasNameLowerCased);
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
          new ChatContext(senderId, chatId, rawMsg, this._socket.Send, this._socket.Receive, {
            cancelKeywords: this._options.cancelKeywords ?? ["cancel", "cancelar", "para", "stop"],
            ignoreSelfMessages: this._options.ignoreSelfMessage ?? true,
            timeoutSeconds: this._options.timeoutSeconds ?? 30,
            wrongTypeFeedbackMsg:
              this._options.wrongTypeFeedbackMsg ?? "wrong expected msg type ❌ (Default Message: Change me using Bot constructor params options)",
            cancelFeedbackMsg: this._options.cancelFeedbackMsg ?? "canceled ❌ (Default Message: Change me using Bot constructor params options)",
          }),
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
        if (WhatsSocketReceiverHelper_isReceiverError(e)) {
          if (e.wasAbortedByUser && this._options.loggerMode !== "silent") {
            console.log(`[Command Canceled]: Name ${commandOrAliasNameLowerCased}`);
          }
          if (e.errorMessage === WhatsSocketReceiverMsgError.Timeout && this._options.loggerMode !== "silent") {
            console.log(`[Command Timeout]: Name ${commandOrAliasNameLowerCased}`);
          }
        } else {
          if (this._options.loggerMode !== "silent")
            console.log(
              `[COMMAND EXECUTION ERROR]: Error when trying to execute '${commandOrAliasNameLowerCased}'\n\n`,
              `Error Info: ${JSON.stringify(e, null, 2)}`
            );
        }
      }
    }
  } //EVENT_...() Method

  /**
   * Registers a middleware function to be executed on every incoming message.
   *
   * Middleware functions are executed **before any command processing** occurs.
   * They allow you to inspect, modify, or react to incoming messages globally.
   *
   * Middleware execution:
   * - Middleware is executed in the order it was added.
   * - Each middleware receives the full context of the message, including sender ID,
   *   chat ID, the raw WhatsApp message, message type, and sender type.
   * - Middleware can optionally call the `next()` callback to pass control to the next middleware.
   *   If `next()` is not called, subsequent middleware and command processing are skipped.
   *
   * @param middleware - A function to handle incoming messages. The function receives:
   *   - `senderId` - The ID of the user who sent the message, or `null` if unknown.
   *   - `chatId` - The ID of the chat where the message was sent.
   *   - `rawMsg` - The full WhatsApp message object.
   *   - `msgType` - The type of the message (e.g., text, image, video).
   *   - `senderType` - Whether the message comes from an individual or a group participant.
   *   - `next` - A function to call to continue to the next middleware in the chain.
   *
   * @example
   * // Log every incoming message and continue to the next middleware
   * bot.Use((senderId, chatId, rawMsg, msgType, senderType, next) => {
   *   console.log(`Message from ${senderId} in chat ${chatId}:`, rawMsg);
   *   next();
   * });
   *
   * @example
   * // Block messages from a specific user (do not call next)
   * bot.Use((senderId, chatId, rawMsg, msgType, senderType, next) => {
   *   if (senderId === "blockedUserId") return;
   *   next();
   * });
   */
  public Use(middleware: BotMiddleWareFunct): void {
    this._internalMiddleware.push(middleware);
  }
} //Class

//TODO: Add a simple middleware system when OnMessageIncoming
