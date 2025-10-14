import type { WAMessage } from "baileys";
import GraphemeSplitter from "grapheme-splitter";
import { autobind } from "../../helpers/Decorators.helper.js";
import { MsgHelper_ExtractQuotedMsgInfo, MsgHelper_FullMsg_GetText } from "../../helpers/Msg.helper.js";
import Delegate from "../../libs/Delegate.js";
import { MiddlewareChain } from "../../libs/MiddlewareChain.js";
import { type SenderType, MsgType } from "../../Msg.types.js";
import type { IWhatsSocket_Submodule_Receiver } from "../whats_socket/internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "../whats_socket/internals/IWhatsSocket.sugarsender.js";
import { WhatsSocketReceiverHelper_isReceiverError } from "../whats_socket/internals/WhatsSocket.receiver.js";
import type { IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "../whats_socket/IWhatsSocket.js";
import WhatsSocket, { type WhatsSocketOptions } from "../whats_socket/WhatsSocket.js";
import { type IChatContextConfig, ChatContext } from "./internals/ChatContext.js";
import Myself_Submodule_Status from "./internals/ChatContext.myself.status.js";
import CommandsSearcher, { CommandType } from "./internals/CommandsSearcher.js";
import type { CommandArgs, FoundQuotedMsg } from "./internals/CommandsSearcher.types.js";
import type { IChatContext } from "./internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "./internals/ICommand.js";

//Little dependency to verify that "defaulEmojiToSendOnCommandFailure" is 1 emoji length!
const emojiSplitter = new GraphemeSplitter();

export type BotMinimalInfo = {
  Settings: WhatsBotOptions;
  Commands: WhatsBotCommands;
};

export type WhatsBotOptions = Omit<WhatsSocketOptions, "ownImplementationSocketAPIWhatsapp"> &
  Omit<Partial<IChatContextConfig>, "ignoreSelfMessages"> & {
    /**
     * Character(s) used to tag the bot in messages.
     *
     * Useful in group contexts where multiple bots or members exist;
     * allows users to explicitly "mention" the bot.
     *
     * @default '@'
     * @example
     * tagCharPrefix: ['@', '#'] // bot reacts to both "@bot" and "#bot"
     */
    tagPrefix?: string | string[];

    /**
     * Character(s) used to prefix commands.
     *
     * Common convention is `"!"`, but you can use any characters or multiple
     * prefixes to support different command styles.
     *
     * @default '!'
     * @example
     * commandPrefix: ['/'] // commands triggered with "/help"
     */
    commandPrefix?: string | string[];

    /**
     * For advanced users and maintainers: replace the internal WhatsApp socket implementation.
     *
     * If provided, the bot will use this custom implementation instead of the
     * built-in `WhatsSocket`. Useful for testing, extending, or mocking.
     *
     * ⚠️ Use at your own risk — incorrect implementations can break bot behavior.
     */
    ownWhatsSocketImplementation_Internal?: IWhatsSocket;

    /**
     * For advanced users and maintainers: replaces the ChatContext that will be sent to all commands.
     *
     * Used primarly for testing
     *
     * ⚠️ Use at your own risk — incorrect implementations can break bot behavior.
     * @returns
     */
    ownChatContextCreationHook_Internal?: () => IChatContext | null;

    /**
     * Enables or disables the "safe net" around command execution.
     *
     * - When `true` (default): command errors are caught internally, logged,
     *   and prevented from crashing the bot.
     * - When `false`: errors bubble up to the caller, allowing external handling
     *   (useful for integration tests or advanced error pipelines).
     *
     * @default true
     * @remarks This setting is primarily for developers who want fine-grained
     * control over error handling.
     */
    enableCommandSafeNet?: boolean;

    /**
     * Default emoji reaction to send when a command fails unexpectedly.
     *
     * If set, the bot will react to the triggering message with this emoji
     * whenever a command throws or exits with an error.
     *
     * @default undefined (no reaction sent on command failure)
     * @example
     * defaultEmojiToSendReactionOnFailureCommand: "⚠️"
     */
    defaultEmojiToSendReactionOnFailureCommand?: string | null;

    /**
     * Send to chat a json representation of catched error when a
     * commands fails unexpectedly. Useful for debug in real time.
     */
    sendErrorToChatOnFailureCommand_debug?: boolean;
  };

/**
 * Defines all events emitted by the Bot instance.
 *
 * This type aggregates events from the underlying WhatsApp socket
 * (`IWhatsSocket_EventsOnly_Module`) and adds bot-specific events
 * related to command processing and middleware execution.
 */
export type WhatsBotEvents = IWhatsSocket_EventsOnly_Module & {
  /**
   * Fires after the main middleware chain has finished executing.
   *
   * This event is triggered for every incoming message that passes through
   * the middleware pipeline.
   *
   * @param completedSuccessfully - `true` if the chain ran to completion
   * (all middleware called `next()`), `false` if a middleware broke the chain.
   */
  onMainMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>>;

  /**
   * Fires after the "on command found" middleware chain has finished executing.
   *
   * This event only triggers if a valid command was found in the message.
   *
   * @param completedSuccessfully - `true` if the chain ran to completion,
   * `false` if a middleware broke the chain before command execution.
   */
  onFoundCommandMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>>;

  /**
   * Fires when a message is identified as a command (e.g., starts with `!`),
   * but no matching command or alias is registered.
   *
   * Useful for providing "did you mean?" suggestions or a generic help message.
   *
   * @param ctx - The chat context of the incoming message.
   * @param commandNameThatCouldntBeFound - The name of the command the user tried to run.
   */
  onCommandNotFound: Delegate<(ctx: IChatContext, commandNameThatCouldntBeFound: string) => void | Promise<void>>;

  /**
   * Fires when a valid command is found in a message, but **before** it is executed.
   *
   * This serves as a pre-execution hook, ideal for logging, analytics, or
   * dynamic permission checks that shouldn't be part of the command's core logic.
   *
   * @param ctx - The chat context of the incoming message.
   * @param commandToRun - The command object that is about to be executed.
   */
  onCommandFound: Delegate<(ctx: IChatContext, commandToRun: ICommand) => void | Promise<void>>;

  /**
   * Fires **after** a command has been executed.
   *
   * This serves as a post-execution hook, useful for logging the outcome,
   * cleaning up resources, or performing follow-up actions.
   *
   * @param ctx - The chat context of the incoming message.
   * @param commandExecuted - The command object that was just run.
   * @param ranSuccessfully - `true` if the command's `run` method completed
   * without throwing an error, `false` otherwise.
   */
  onCommandFoundAfterItsExecution: Delegate<(ctx: IChatContext, commandExecuted: ICommand, ranSuccessfully: boolean) => void>;
};

export type WhatsBotSender = IWhatsSocket_Submodule_SugarSender;
export type WhatsBotReceiver = IWhatsSocket_Submodule_Receiver;
export type WhatsBotCommands = CommandsSearcher;

export type WhatsbotcordMiddlewareFunct = (
  bot: Bot,
  senderId_LID: string | null,
  senderId_PN: string | null,
  chatId: string,
  rawMsg: WAMessage,
  msgType: MsgType,
  senderType: SenderType,
  next: () => Promise<void>
) => Promise<void> | void;

export type WhatsbotcordMiddlewareFunct_OnFoundCommand = (
  bot: Bot,
  senderId_LID: string | null,
  senderId_PN: string | null,
  chatId: string,
  rawMsg: WAMessage,
  msgType: MsgType,
  senderType: SenderType,
  commandFound: ICommand,
  next: () => Promise<void>
) => Promise<void> | void;

export type WhatsbotcordPlugin = {
  plugin: (bot: Bot) => void;
};

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
  public InternalSocket: IWhatsSocket;
  private _commandSearcher: CommandsSearcher;
  private _internalMiddleware: WhatsbotcordMiddlewareFunct[] = [];
  private _internalMiddleware_OnCommandFound: WhatsbotcordMiddlewareFunct_OnFoundCommand[] = [];

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
  private _EVENT_onCommandNotFound: Delegate<(ctx: IChatContext, commandNameThatCouldntBeFound: string) => void> = new Delegate();

  private _EVENT_onCommandFound: Delegate<(ctx: IChatContext, commandToRun: ICommand) => void | Promise<void>> = new Delegate();

  private _EVENT_onAfterCommandExecution: Delegate<(ctx: IChatContext, commandExecuted: ICommand, ranSuccessfully: boolean) => void | Promise<void>> =
    new Delegate();

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
  private _EVENT_onMainMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>> = new Delegate();

  private _EVENT_OnFoundCommandMiddlewareEnd: Delegate<(completedSuccessfully: boolean) => void | Promise<void>> = new Delegate();
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
    return this.InternalSocket.Send;
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
    return this.InternalSocket.Receive;
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
      onGroupEnter: this.InternalSocket.onGroupEnter,
      onGroupUpdate: this.InternalSocket.onGroupUpdate,
      onIncomingMsg: this.InternalSocket.onIncomingMsg,
      onRestart: this.InternalSocket.onRestart,
      onSentMessage: this.InternalSocket.onSentMessage,
      onStartupAllGroupsIn: this.InternalSocket.onStartupAllGroupsIn,
      onUpdateMsg: this.InternalSocket.onUpdateMsg,
      onCommandNotFound: this._EVENT_onCommandNotFound,
      onMainMiddlewareEnd: this._EVENT_onMainMiddlewareEnd,
      onCommandFound: this._EVENT_onCommandFound,
      onCommandFoundAfterItsExecution: this._EVENT_onAfterCommandExecution,
      onFoundCommandMiddlewareEnd: this._EVENT_OnFoundCommandMiddlewareEnd,
    };
  }

  public get Commands(): WhatsBotCommands {
    return this._commandSearcher;
  }

  /**
   * Creates a new `Bot` instance with customizable behavior.
   *
   * The constructor accepts a `WhatsBotOptions` object that allows overriding
   * runtime settings such as logging, message delays, command handling, and
   * socket implementation.
   *
   * @param options - Optional configuration for customizing bot behavior.
   *
   * Default values:
   * - `credentialsFolder`: `"./auth"`
   *   Folder path where WhatsApp session credentials are stored and reused.
   *
   * - `delayMilisecondsBetweenMsgs`: `100`
   *   Minimum delay (in ms) between consecutive outgoing messages.
   *   Helps avoid spam detection and rate-limiting by WhatsApp.
   *
   * - `ignoreSelfMessage`: `true`
   *   When enabled, the bot ignores messages sent by its own account.
   *
   * - `loggerMode`: `"recommended"`
   *   Logging verbosity. `"recommended"` provides balanced visibility;
   *   other modes may increase or decrease log detail.
   *
   * - `maxReconnectionRetries`: `5`
   *   Number of reconnection attempts before giving up when the socket disconnects.
   *
   * - `senderQueueMaxLimit`: `20`
   *   Maximum number of pending messages allowed in the send queue.
   *   Prevents unbounded memory growth if the bot cannot send fast enough.
   *
   * - `commandPrefix`: `["!"]`
   *   One or more prefixes that trigger command execution.
   *   Can be a string or string[]; strings are normalized into arrays.
   *
   * - `tagCharPrefix`: `["@"]`
   *   Characters used to denote mentions or tagging in commands.
   *   Similar normalization rules as `commandPrefix`.
   *
   * - `cancelFeedbackMsg`:
   *   `"canceled ❌ (Default Message: Change me using Bot constructor params options)"`
   *   Feedback message shown when a user cancels an interactive flow.
   *
   * - `cancelKeywords`: `["cancel", "cancelar", "para", "stop"]`
   *   Keywords that trigger cancellation of interactive sessions.
   *
   * - `timeoutSeconds`: `30`
   *   Default timeout for interactive flows (in seconds).
   *
   * - `wrongTypeFeedbackMsg`:
   *   `"wrong expected msg type ❌ (Default Message: Change me using Bot constructor params options)"`
   *   Feedback shown when the received message type doesn’t match expectations.
   *
   * - `ownWhatsSocketImplementation`: `undefined`
   *   Allows injecting a custom `WhatsSocket` implementation. If omitted,
   *   the built-in socket (`new WhatsSocket(Settings)`) is used.
   *
   * - `enableCommandSafeNet`: `true`
   *   Enables a safeguard layer around command execution, preventing
   *   crashes or unintended side effects from propagating.
   *
   * @remarks
   * - All defaults are applied when their corresponding `options` field
   *   is `undefined` or invalid.
   * - `commandPrefix` and `tagCharPrefix` always normalize to arrays.
   * - For production bots, consider raising `delayMilisecondsBetweenMsgs`
   *   slightly to avoid WhatsApp anti-spam systems.
   */
  constructor(options?: WhatsBotOptions) {
    this.Settings = BotUtils_GenerateOptions(options);

    //# Validations:
    //      1.Validate is only one emoji length on defaultEmojiToSend...
    if (this.Settings.defaultEmojiToSendReactionOnFailureCommand) {
      const emojisCount: number = emojiSplitter.countGraphemes(this.Settings.defaultEmojiToSendReactionOnFailureCommand);
      if (emojisCount !== 1) {
        throw new Error(
          "WhatsbotCord BOT received in 'defaultEmojiToSendReactionOnFailureCommand' a non valid SINGLE emoji. Received instead: " +
            this.Settings.defaultEmojiToSendReactionOnFailureCommand
        );
      }
    }

    this._commandSearcher = new CommandsSearcher();
    this.InternalSocket = this.Settings.ownWhatsSocketImplementation_Internal ?? new WhatsSocket(this.Settings);
    this.InternalSocket.onIncomingMsg.Subscribe(this.EVENT_OnMessageIncoming);
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
  @autobind
  public async Start(): Promise<void> {
    return this.InternalSocket.Start();
  }

  /**
   * Registers a middleware function or a plugin to intercept incoming messages.
   *
   * This method serves as the main entry point for extending bot functionality.
   * Middleware is executed in registration order **before** any command processing.
   *
   * ### Use as Middleware
   * Pass a function to inspect, modify, or block messages globally. Each
   * middleware receives a `next()` function. Call `next()` to pass control
   * to the next middleware. If `next()` is not called, the processing chain
   * stops, preventing subsequent middleware and commands from running.
   *
   * ### Use as a Plugin
   * Pass an object with a `plugin` method. Plugins are ideal for encapsulating
   * complex or reusable logic, such as registering multiple commands and listeners at once.
   *
   * @param usePluginOrMiddleware - The middleware function or plugin object to register.
   *
   * @example
   * // Middleware for logging all incoming messages
   * bot.Use(async (bot, senderId, chatId, rawMsg, msgType, senderType, next) => {
   * console.log(`New message in chat ${chatId}`);
   * await next(); // Continue to the next middleware
   * });
   *
   * @example
   * // Middleware to block a specific user
   * bot.Use((bot, senderId, chatId, rawMsg, msgType, senderType, next) => {
   * if (senderId === "user-to-block@s.whatsapp.net") {
   * return; // Stop the chain by not calling next()
   * }
   * next();
   * });
   */
  @autobind
  public Use(usePluginOrMiddleware: WhatsbotcordMiddlewareFunct | WhatsbotcordPlugin): void {
    if (typeof usePluginOrMiddleware === "function") {
      this._internalMiddleware.push(usePluginOrMiddleware);
    }
    if (typeof usePluginOrMiddleware === "object") {
      usePluginOrMiddleware.plugin(this);
    }
  }

  /**
   * Registers middleware that runs only when a valid command is found.
   *
   * This hook executes **after** a command has been identified but **before** the
   * command's `run` method is called. It's the ideal place for command-specific
   * logic like permission checks, cooldowns, or logging.
   *
   * Like general middleware, you must call `next()` to proceed. If `next()` is
   * not called, the command will not be executed.
   *
   * @param useMiddleware - The middleware function to execute. It receives all
   * standard message parameters, plus the `commandFound` object.
   * @see Use for general-purpose middleware that runs on all messages.
   *
   * @example
   * // Middleware to allow a command only for admins
   * bot.Use_OnCommandFound(async (bot, senderId, chatId, rawMsg, msgType, senderType, commandFound, next) => {
   * const admins = ["admin1@s.whatsapp.net", "admin2@s.whatsapp.net"];
   * if (commandFound.name === "ban" && !admins.includes(senderId)) {
   * // User is not an admin, block the command
   * await bot.SendMsg.Text(chatId, "You don't have permission to use that command.");
   * return;
   * }
   * // User has permission, proceed to execute the command
   * await next();
   * });
   */
  @autobind
  public Use_OnCommandFound(useMiddleware: WhatsbotcordMiddlewareFunct_OnFoundCommand): void {
    this._internalMiddleware_OnCommandFound.push(useMiddleware);
  }

  @autobind
  private async EVENT_OnMessageIncoming(
    senderId_LID: string | null,
    senderId_PN: string | null,
    chatId: string,
    rawMsg: WAMessage,
    msgType: MsgType,
    senderType: SenderType
  ): Promise<void> {
    // ======== Middleware chain section ========
    const mainMiddleware = new MiddlewareChain(this._internalMiddleware);
    const middlewareChainSuccess = await mainMiddleware.run(this, senderId_LID, senderId_PN, chatId, rawMsg, msgType, senderType);
    this.Events.onMainMiddlewareEnd.CallAll(middlewareChainSuccess);
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
      let commandArgs: string[] = rawArgs.length > 1 ? rawArgs.slice(1) : [];

      // === Check if command, then what type ===
      const prefix: string = txtFromMsgHealthy[0]!;
      let commandFound: ICommand | null = null;
      let commandTypeFound: CommandType | null = null;
      // 1. Check if its normal command
      if (typeof this.Settings.commandPrefix === "string" ? this.Settings.commandPrefix === prefix : this.Settings.commandPrefix?.includes(prefix)) {
        commandTypeFound = CommandType.Normal;
        commandFound = this.Commands.GetCommand(commandOrAliasNameLowerCased);
        if (this.Commands.Defaults.Command) {
          if (this.Commands.Defaults.Command === commandFound) {
            commandArgs = rawArgs.filter((word) => word !== "");
          }
        }
        // 2. Check if is tag command
      } else if (typeof this.Settings.tagPrefix === "string" ? this.Settings.tagPrefix === prefix : this.Settings.tagPrefix?.includes(prefix)) {
        commandTypeFound = CommandType.Tag;
        commandFound = this.Commands.GetTag(commandOrAliasNameLowerCased);
        if (this.Commands.Defaults.Tag) {
          if (this.Commands.Defaults.Tag === commandFound) {
            commandArgs = rawArgs.filter((word) => word !== "");
          }
        }
      }
      // 3. Found type of command but not with normal name? Try searching if its an alias
      if (!commandFound && commandTypeFound) {
        commandFound = this.Commands.GetWhateverWithAlias(commandOrAliasNameLowerCased, commandTypeFound);
      }
      // 4. Can't be found after all that? its not a valid command
      if (!commandFound) {
        await this.Events.onCommandNotFound.CallAllAsync(
          new ChatContext(senderId_LID, senderId_PN, chatId, rawMsg, this.InternalSocket.Send, this.InternalSocket.Receive, {
            cancelKeywords: this.Settings.cancelKeywords!,
            timeoutSeconds: this.Settings.timeoutSeconds!,
            ignoreSelfMessages: this.Settings.ignoreSelfMessage!,
            wrongTypeFeedbackMsg: this.Settings.wrongTypeFeedbackMsg,
            cancelFeedbackMsg: this.Settings.cancelFeedbackMsg,
          }),
          txtFromMsg
        );
        return;
      } else {
        if (this.Events.onCommandFound.Length > 0) {
          await this.Events.onCommandFound.CallAllAsync(
            new ChatContext(senderId_LID, senderId_PN, chatId, rawMsg, this.InternalSocket.Send, this.InternalSocket.Receive, {
              cancelKeywords: this.Settings.cancelKeywords!,
              timeoutSeconds: this.Settings.timeoutSeconds!,
              ignoreSelfMessages: this.Settings.ignoreSelfMessage!,
              wrongTypeFeedbackMsg: this.Settings.wrongTypeFeedbackMsg,
              cancelFeedbackMsg: this.Settings.cancelFeedbackMsg,
            }),
            commandFound
          );
        }

        //2nd Middleware
        const middlewareOnFound = new MiddlewareChain(this._internalMiddleware_OnCommandFound);
        const shouldContinueAgain = await middlewareOnFound.run(this, senderId_LID, senderId_PN, chatId, rawMsg, msgType, senderType, commandFound);
        await this.Events.onFoundCommandMiddlewareEnd.CallAllAsync(shouldContinueAgain);
        if (!shouldContinueAgain) {
          return;
        }
      }

      const quotedMsgAsArgument: FoundQuotedMsg | null = MsgHelper_ExtractQuotedMsgInfo(rawMsg);

      //=========================================================
      let ARG1_ChatContext: IChatContext;
      const customChatContext: IChatContext | null = this.Settings.ownChatContextCreationHook_Internal!();
      if (customChatContext) {
        ARG1_ChatContext = customChatContext;
      } else {
        ARG1_ChatContext = new ChatContext(senderId_LID, senderId_PN, chatId, rawMsg, this.InternalSocket.Send, this.InternalSocket.Receive, {
          cancelKeywords: this.Settings.cancelKeywords!,
          timeoutSeconds: this.Settings.timeoutSeconds!,
          ignoreSelfMessages: this.Settings.ignoreSelfMessage!,
          wrongTypeFeedbackMsg: this.Settings.wrongTypeFeedbackMsg,
          cancelFeedbackMsg: this.Settings.cancelFeedbackMsg,
        });
      }
      const ARG2_AdditionalAPI: AdditionalAPI = {
        // @deprecated ones: InternalSockets already have them inside!
        // Receive: this._socket.Receive,
        // Send: this._socket.Send,
        InternalSocket: this.InternalSocket,
        Myself: {
          Status: new Myself_Submodule_Status(this.InternalSocket),
          Bot: this,
        },
      };
      const ARG3_AdditionalArgs: CommandArgs = {
        args: commandArgs,
        chatId: chatId,
        msgType: msgType,
        originalRawMsg: rawMsg,
        senderType: senderType,
        participantIdLID: senderId_LID,
        participantIdPN: senderId_PN,
        quotedMsgInfo: quotedMsgAsArgument,
        botInfo: this,
      };
      try {
        await commandFound.run(
          /** Chat Context */
          ARG1_ChatContext,
          /** RawAPI */
          ARG2_AdditionalAPI,
          /** Command basic arguments */
          ARG3_AdditionalArgs
        );
        this._EVENT_onAfterCommandExecution.CallAll(ARG1_ChatContext, commandFound, true);
      } catch (e) {
        if (this.Settings.defaultEmojiToSendReactionOnFailureCommand) {
          await ARG1_ChatContext.SendReactEmojiToInitialMsg(this.Settings.defaultEmojiToSendReactionOnFailureCommand);
        }
        if (this.Settings.sendErrorToChatOnFailureCommand_debug) {
          await ARG1_ChatContext.SendText(JSON.stringify(e, null, 2), { normalizeMessageText: false });
        }
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

        //TODO: Test this BOT EVENTS (all this._EVENT*** props!)
        await this._EVENT_onAfterCommandExecution.CallAllAsync(ARG1_ChatContext, commandFound, false);
        if (!this.Settings.enableCommandSafeNet) {
          throw e;
        }
      }
    }
  } //EVENT_...() Method
}

export function BotUtils_GenerateOptions(options?: Partial<WhatsBotOptions>): WhatsBotOptions {
  return {
    credentialsFolder: options?.credentialsFolder ?? "./auth",
    delayMilisecondsBetweenMsgs: options?.delayMilisecondsBetweenMsgs ?? 100,
    ignoreSelfMessage: options?.ignoreSelfMessage ?? true,
    loggerMode: options?.loggerMode ?? "recommended",
    maxReconnectionRetries: options?.maxReconnectionRetries ?? 5,
    senderQueueMaxLimit: options?.senderQueueMaxLimit ?? 20,
    commandPrefix: typeof options?.commandPrefix === "string" ? [options.commandPrefix] : options?.commandPrefix ?? ["!"],
    tagPrefix: typeof options?.tagPrefix === "string" ? [options.tagPrefix] : options?.tagPrefix ?? ["@"],
    cancelFeedbackMsg: options?.cancelFeedbackMsg ?? "canceled ❌ (Default Message: Change me using Bot constructor params options)",
    cancelKeywords: options?.cancelKeywords ?? ["cancel", "cancelar", "para", "stop"],
    timeoutSeconds: options?.timeoutSeconds ?? 30,
    wrongTypeFeedbackMsg: options?.wrongTypeFeedbackMsg ?? "wrong expected msg type ❌ (Default Message: Change me using Bot constructor params options)",
    ownWhatsSocketImplementation_Internal: options?.ownWhatsSocketImplementation_Internal,
    enableCommandSafeNet: options?.enableCommandSafeNet ?? true,
    defaultEmojiToSendReactionOnFailureCommand: options?.defaultEmojiToSendReactionOnFailureCommand ?? null,
    sendErrorToChatOnFailureCommand_debug: options?.sendErrorToChatOnFailureCommand_debug ?? false,
    ownChatContextCreationHook_Internal: options?.ownChatContextCreationHook_Internal ?? (() => null),
  };
}
