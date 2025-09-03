import type { WhatsSocketReceiver_SubModule } from "../whats_socket/internals/WhatsSocket.receiver";
import type { WhatsSocketSugarSender_Submodule } from "../whats_socket/internals/WhatsSocket.sugarsenders";
import type {
  IWhatsSocket,
  IWhatsSocket_EventsOnly_Module,
} from "../whats_socket/IWhatsSocket";
import WhatsSocket, {
  type WhatsSocketOptions,
} from "../whats_socket/WhatsSocket";
import CommandsSearcher from "./internals/CommandsSearcher";

export type WhatsBotOptions = Omit<
  WhatsSocketOptions,
  "ownImplementationSocketAPIWhatsapp"
>;
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
 * `CommandsSearcher` system, rather than manually sending or receiving messages.
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
  private _socketOptions: WhatsBotOptions;

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
    this._socketOptions = {
      credentialsFolder: options?.credentialsFolder ?? "./auth",
      delayMilisecondsBetweenMsgs: options?.delayMilisecondsBetweenMsgs ?? 100,
      ignoreSelfMessage: options?.ignoreSelfMessage ?? true,
      loggerMode: options?.loggerMode ?? "debug",
      maxReconnectionRetries: options?.maxReconnectionRetries ?? 5,
      senderQueueMaxLimit: options?.senderQueueMaxLimit ?? 20,
    };

    this.Start = this.Start.bind(this);

    this._commandSearcher = new CommandsSearcher();
    this._socket = new WhatsSocket(this._socketOptions);
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
}
