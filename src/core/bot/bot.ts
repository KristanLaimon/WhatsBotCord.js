import type { WAMessage, proto } from "baileys";
import { MsgHelper_FullMsg_GetQuotedMsg, MsgHelper_FullMsg_GetText, MsgHelper_ProtoMsg_GetMsgType } from "../../helpers/Msg.helper.js";
import Delegate from "../../libs/Delegate.js";
import { type SenderType, MsgType } from "../../Msg.types.js";
import { type WhatsSocket_Submodule_Receiver, WhatsSocketReceiverHelper_isReceiverError } from "../whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsSocket_Submodule_SugarSender } from "../whats_socket/internals/WhatsSocket.sugarsenders.js";
import type { IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "../whats_socket/IWhatsSocket.js";
import WhatsSocket, { type WhatsSocketOptions } from "../whats_socket/WhatsSocket.js";
import { type ChatContextConfig, ChatContext } from "./internals/ChatContext.js";
import CommandsSearcher, { CommandType } from "./internals/CommandsSearcher.js";
import type { FoundQuotedMsg } from "./internals/CommandsSearcher.types.js";
import type { ICommand } from "./internals/IBotCommand.js";

export type BotMinimalInfo = {
  Settings: WhatsBotOptions;
  Commands: WhatsBotCommands;
};

export type WhatsBotOptions = Omit<WhatsSocketOptions, "ownImplementationSocketAPIWhatsapp"> &
  Omit<Partial<ChatContextConfig>, "ignoreSelfMessages"> & {
    /**
     * Character(s) used to tag the bot.
     * @default '@'
     */
    tagCharPrefix?: string | string[];

    /**
     * Character(s) used to prefix commands.
     * @default '!'
     */
    commandPrefix?: string | string[];

    /**
     * For advanced users: replace the internal WhatsApp socket implementation.
     * Use at your own risk.
     */
    ownWhatsSocketImplementation?: IWhatsSocket;

    /**
     * Disables the "safe net" for command execution.
     * When `false`, all command errors are caught internally and logged.
     * When `true`, (default) errors thrown by commands will bubble up instead of being swallowed.
     *
     * In case of advanced scenarios where you want to handle errors externally
     * or you want to include bot inside your tests and recognize the error
     */
    enableCommandSafeNet?: boolean;
  };

export type WhatsBotEvents = IWhatsSocket_EventsOnly_Module & {
  onCommandNotFound: Delegate<(commandNameThatCouldntBeFound: string) => void | Promise<void>>;
  onMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>>;
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
  next: () => Promise<void>
) => Promise<void> | void;

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
export default class Bot implements BotMinimalInfo {
  private _socket: IWhatsSocket;
  private _commandSearcher: CommandsSearcher;
  private _internalMiddleware: BotMiddleWareFunct[] = [];

  /** Bot Specific Events */
  /**
   * Event triggered when the bot receives a message that looks like a command,
   * but no registered command or alias matches it.
   *
   * Example usage:
   * ```ts
   * bot.Events.onCommandNotFound.Subscribe((name) => {
   *   console.log(`User tried unknown command: ${name}`);
   * });
   * ```
   */
  private _onCommandNotFound: Delegate<(commandNameThatCouldntBeFound: string) => void> = new Delegate();

  /**
   * Event triggered **after the middleware chain finishes running**.
   *
   * - The argument is `true` if the chain executed successfully to the end.
   * - The argument is `false` if some middleware stopped the chain by not calling `next()`.
   *
   * Example usage:
   * ```ts
   * bot.Events.onMiddlewareEnd.Subscribe((success) => {
   *   if (success) console.log("All middleware finished");
   *   else console.log("Middleware chain was interrupted early");
   * });
   * ```
   */
  private _onMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>> = new Delegate();
  /**
   * Current bot configuration settings.
   *
   * These settings are derived from the constructor options, with defaults applied
   * where values were not provided.
   *
   * ⚠️ Changing properties on this object **after the bot has started** can affect its actual functionality.
   *
   * Typical use cases:
   * - Reading the active command or tag prefix
   * - Inspecting runtime limits (timeouts, queue limits, etc.)
   *
   * Example:
   * ```ts
   * console.log(bot.Settings.commandPrefix); // ["!"]
   * ```
   */
  public Settings: WhatsBotOptions;

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

  /** Exposes all bot-related events that consumers can subscribe to.
   *
   * These events are implemented using `Delegate`, which provides `Subscribe` and
   * `Unsubscribe` methods to attach or detach handlers.
   *
   * Example usage:
   * ```ts
   * bot.Events.onIncomingMsg.Subscribe((msg) => {
   *   console.log("Raw incoming message:", msg);
   * });
   *
   * bot.Events.onCommandNotFound.Subscribe((name) => {
   *   console.warn(`Unknown command: ${name}`);
   * });
   *
   * bot.Events.onMiddlewareEnd.Subscribe((success) => {
   *   console.log(success ? "Middleware chain finished" : "Middleware interrupted");
   * });
   * ```
   */
  public get Events(): WhatsBotEvents {
    return {
      onGroupEnter: this._socket.onGroupEnter,
      onGroupUpdate: this._socket.onGroupUpdate,
      onIncomingMsg: this._socket.onIncomingMsg,
      onRestart: this._socket.onRestart,
      onSentMessage: this._socket.onSentMessage,
      onStartupAllGroupsIn: this._socket.onStartupAllGroupsIn,
      onUpdateMsg: this._socket.onUpdateMsg,
      onCommandNotFound: this._onCommandNotFound,
      onMiddlewareEnd: this._onMiddlewareEnd,
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
    this.Settings = {
      credentialsFolder: options?.credentialsFolder ?? "./auth",
      delayMilisecondsBetweenMsgs: options?.delayMilisecondsBetweenMsgs ?? 100,
      ignoreSelfMessage: options?.ignoreSelfMessage ?? true,
      loggerMode: options?.loggerMode ?? "recommended",
      maxReconnectionRetries: options?.maxReconnectionRetries ?? 5,
      senderQueueMaxLimit: options?.senderQueueMaxLimit ?? 20,
      commandPrefix: typeof options?.commandPrefix === "string" ? [options.commandPrefix] : options?.commandPrefix ?? ["!"],
      tagCharPrefix: typeof options?.tagCharPrefix === "string" ? [options.tagCharPrefix] : options?.tagCharPrefix ?? ["@"],
      cancelFeedbackMsg: options?.cancelFeedbackMsg ?? "canceled ❌ (Default Message: Change me using Bot constructor params options)",
      cancelKeywords: options?.cancelKeywords ?? ["cancel", "cancelar", "para", "stop"],
      timeoutSeconds: options?.timeoutSeconds ?? 30,
      wrongTypeFeedbackMsg: options?.wrongTypeFeedbackMsg ?? "wrong expected msg type ❌ (Default Message: Change me using Bot constructor params options)",
      ownWhatsSocketImplementation: options?.ownWhatsSocketImplementation,
      enableCommandSafeNet: options?.enableCommandSafeNet ?? true,
    };

    this.Start = this.Start.bind(this);
    this._commandSearcher = new CommandsSearcher();
    this._socket = this.Settings.ownWhatsSocketImplementation ?? new WhatsSocket(this.Settings);
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
   * bot.Use(async (senderId, chatId, rawMsg, msgType, senderType, next) => {
   *   console.log(`Message from ${senderId} in chat ${chatId}:`, rawMsg);
   *   next();
   * });
   *
   * @example
   * // Block messages from a specific user (do not call next)
   * bot.Use(async (senderId, chatId, rawMsg, msgType, senderType, next) => {
   *   if (senderId === "blockedUserId") return;
   *   next();
   * });
   */
  public Use(middleware: BotMiddleWareFunct): void {
    this._internalMiddleware.push(middleware);
  }

  private async EVENT_OnMessageIncoming(senderId: string | null, chatId: string, rawMsg: WAMessage, msgType: MsgType, senderType: SenderType): Promise<void> {
    // ======== Middleware chain section ========
    let middlewareChainSuccess: boolean = false;
    const callMiddleware = async (index: number): Promise<void> => {
      if (index >= this._internalMiddleware.length) {
        middlewareChainSuccess = true;
        return; // end of chain
      }
      const middleware = this._internalMiddleware[index]!;
      await Promise.resolve(middleware(senderId, chatId, rawMsg, msgType, senderType, (): Promise<void> => callMiddleware(index + 1)));
    };
    await callMiddleware(0);
    this.Events.onMiddlewareEnd.CallAll(middlewareChainSuccess);
    if (!middlewareChainSuccess) return;

    // ==== Main Logic =====
    if (msgType === MsgType.Text) {
      const txtFromMsg: string | null = MsgHelper_FullMsg_GetText(rawMsg);
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
      let commandFound: ICommand | null = null;
      let commandTypeFound: CommandType | null = null;
      // 1. Check if its normal command
      if (typeof this.Settings.commandPrefix === "string" ? this.Settings.commandPrefix === prefix : this.Settings.commandPrefix?.includes(prefix)) {
        commandTypeFound = CommandType.Normal;
        commandFound = this.Commands.GetCommand(commandOrAliasNameLowerCased);
        // 2. Check if is tag command
      } else if (typeof this.Settings.tagCharPrefix === "string" ? this.Settings.tagCharPrefix === prefix : this.Settings.tagCharPrefix?.includes(prefix)) {
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

      const existsQuotedMsg: proto.IMessage | null = MsgHelper_FullMsg_GetQuotedMsg(rawMsg);
      let quotedMsgAsArgument: FoundQuotedMsg | null = null;
      if (existsQuotedMsg) {
        const quotedMsgType: MsgType = MsgHelper_ProtoMsg_GetMsgType(existsQuotedMsg);
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
            cancelKeywords: this.Settings.cancelKeywords!,
            timeoutSeconds: this.Settings.timeoutSeconds!,
            ignoreSelfMessages: this.Settings.ignoreSelfMessage!,
            wrongTypeFeedbackMsg: this.Settings.wrongTypeFeedbackMsg,
            cancelFeedbackMsg: this.Settings.cancelFeedbackMsg,
          }),
          /** RawAPI */
          {
            Receive: this._socket.Receive,
            Send: this._socket.Send,
            InternalSocket: this._socket,
          },
          /** Command basic arguments */
          {
            args: commandArgs,
            chatId: chatId,
            msgType: msgType,
            originalRawMsg: rawMsg,
            senderType: senderType,
            userId: senderId,
            quotedMsgInfo: quotedMsgAsArgument,
            botInfo: this,
          }
        );
      } catch (e) {
        if (WhatsSocketReceiverHelper_isReceiverError(e)) {
          if (e.wasAbortedByUser && this.Settings.loggerMode !== "silent") {
            console.log(`[Command Canceled]: Name ${commandOrAliasNameLowerCased}`);
          }
        } else {
          if (this.Settings.loggerMode !== "silent")
            console.log(
              `[COMMAND EXECUTION ERROR]: Error when trying to execute '${commandOrAliasNameLowerCased}'\n\n`,
              `Error Info: ${JSON.stringify(e, null, 2)}`
            );
        }
        if (!this.Settings.enableCommandSafeNet) {
          throw e;
        }
      }
    }
  } //EVENT_...() Method
}

//TODO: Create testing toolkit for users to simulate chats with these commands!
// public async RunCommand(command: ICommand, config: BotRunningCommandParams ): Promise<boolean>{
//     try {
//       await command.run(
//         /** Chat Context */
//         new ChatContext(
//           config.sender_participant_ID ?? null,
//           config.chatID,
//           {
//             key: {
//               remoteJid: config.chatID,
//               participant: config.sender_participant_ID,
//               fromMe: false,
//             },
//           },
//           this._socket.Send,
//           this._socket.Receive,
//           {
//             cancelKeywords: this.Settings.cancelKeywords!,
//             timeoutSeconds: this.Settings.timeoutSeconds!,
//             ignoreSelfMessages: this.Settings.ignoreSelfMessage!,
//             wrongTypeFeedbackMsg: this.Settings.wrongTypeFeedbackMsg,
//             cancelFeedbackMsg: this.Settings.cancelFeedbackMsg,
//           }
//         ),
//         /** RawAPI */
//         {
//           Receive: this._socket.Receive,
//           Send: this._socket.Send,
//         },
//         /** Command basic arguments */
//         {
//           args: commandArgs,
//           chatId: config.chatID,
//           msgType: msgType,
//           originalRawMsg: rawMsg,
//           senderType: senderType,
//           userId: config.sender_participant_ID ?? null,
//           quotedMsgInfo: quotedMsgAsArgument,
//         }
//       );
//     } catch (e) {
//       if (WhatsSocketReceiverHelper_isReceiverError(e)) {
//         if (e.wasAbortedByUser && this.Settings.loggerMode !== "silent") {
//           console.log(`[Command Canceled]: Name ${commandOrAliasNameLowerCased}`);
//         }
//       } else {
//         if (this.Settings.loggerMode !== "silent")
//           console.log(
//             `[COMMAND EXECUTION ERROR]: Error when trying to execute '${commandOrAliasNameLowerCased}'\n\n`,
//             `Error Info: ${JSON.stringify(e, null, 2)}`
//           );
//       }
//       if (!this.Settings.enableCommandSafeNet) {
//         throw e;
//       }
//     }
//   }
// }
// } //Class

// type CommandArgsMinimum = {
//   args?: string[];
//   customIncomingMsgType?: MsgType;
//   customQuotedMsg?: FoundQuotedMsg;
// }

// type BotRunningCommandParams = {
//   chatID: string;
//   sender_participant_ID?: string;
//   args: ;
// }
